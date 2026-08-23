import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { DateTime } from 'luxon';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ai-summary') private readonly aiSummaryQueue: Queue,
    @InjectQueue('ai-weekly-digest')
    private readonly aiWeeklyDigestQueue: Queue,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly notificationsService: import('../notifications/notifications.service').NotificationsService,
  ) {}

  /**
   * Helper to determine if a given date is a working day based on workspace settings.
   * Luxon weekday: 1 (Mon) to 7 (Sun)
   * Prisma workingDays: array of 0 (Sun) to 6 (Sat)
   */
  private isWorkingDay(date: DateTime, workingDays: number[]): boolean {
    const jsDay = date.weekday === 7 ? 0 : date.weekday;
    return workingDays.includes(jsDay);
  }

  // Window Close Processor - Runs every 5 minutes (Phase 4.4)
  @Cron('*/5 * * * *')
  async processWindowClose() {
    this.logger.log('CRON: Running Window Close Processor');

    // Get all active workspaces
    const workspaces = await this.prisma.workspace.findMany({
      include: {
        members: {
          where: { isActive: true },
        },
      },
    });

    for (const workspace of workspaces) {
      try {
        const localTime = DateTime.now().setZone(workspace.timezone);
        if (!localTime.isValid) {
          this.logger.warn(
            `Invalid timezone ${workspace.timezone} for workspace ${workspace.id}`,
          );
          continue;
        }

        // Check if today is a working day
        const workingDays = workspace.workingDays;
        if (!this.isWorkingDay(localTime, workingDays)) {
          continue;
        }

        const localDateString = localTime.toISODate(); // e.g. "2026-08-23"

        // Parse standupWindowEnd (e.g., "10:00")
        const [endHour, endMinute] = workspace.standupWindowEnd
          .split(':')
          .map(Number);

        // Create a DateTime representing the window close time for today in local timezone
        const windowCloseTime = localTime.set({
          hour: endHour,
          minute: endMinute,
          second: 0,
          millisecond: 0,
        });

        // If current time is past the window close time, AND we haven't processed today yet
        const lastProcessedStr = workspace.lastProcessedDate
          ? DateTime.fromJSDate(workspace.lastProcessedDate).toISODate()
          : null;

        if (
          localTime > windowCloseTime &&
          localDateString !== lastProcessedStr
        ) {
          this.logger.log(
            `Window closed for workspace ${workspace.id} on ${localDateString}`,
          );

          // 1. Find all active members who haven't submitted today
          const startOfLocalDay = localTime.startOf('day').toJSDate();

          const submittedEntries = await this.prisma.standupEntry.findMany({
            where: {
              workspaceId: workspace.id,
              standupDate: startOfLocalDay,
            },
            select: { userId: true },
          });
          const submittedUserIds = new Set(
            submittedEntries.map((e) => e.userId),
          );

          const missedMembers = workspace.members.filter(
            (m) => !submittedUserIds.has(m.userId),
          );

          // 2. Create MISSED entries
          if (missedMembers.length > 0) {
            await this.prisma.standupEntry.createMany({
              data: missedMembers.map((m) => ({
                workspaceId: workspace.id,
                userId: m.userId,
                standupDate: startOfLocalDay,
                status: 'MISSED',
                submittedAt: new Date(), // UTC time of execution
              })),
              skipDuplicates: true,
            });
          }

          // 3. Update lastProcessedDate
          await this.prisma.workspace.update({
            where: { id: workspace.id },
            data: { lastProcessedDate: startOfLocalDay },
          });

          // 4. Dispatch AI Summary job (PRO and ENTERPRISE only)
          if (workspace.subscriptionTier !== 'FREE') {
            await this.aiSummaryQueue.add(
              'generate-daily-summary',
              { workspaceId: workspace.id, targetDate: startOfLocalDay },
              { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
            );
          }

          // 5. Check if it's the last working day of the week to dispatch Weekly Digest
          // We assume workingDays is sorted. E.g. [1, 2, 3, 4, 5] -> last is 5 (Friday)
          const sortedWorkingDays = [...workingDays].sort();
          const lastWorkingDayOfWeek =
            sortedWorkingDays[sortedWorkingDays.length - 1];
          const jsDay = localTime.weekday === 7 ? 0 : localTime.weekday;

          if (
            jsDay === lastWorkingDayOfWeek &&
            workspace.subscriptionTier === 'ENTERPRISE'
          ) {
            this.logger.log(
              `Dispatching Weekly Digest for workspace ${workspace.id}`,
            );
            await this.aiWeeklyDigestQueue.add(
              'generate-weekly-digest',
              { workspaceId: workspace.id, targetDate: startOfLocalDay },
              { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error processing window close for workspace ${workspace.id}`,
          error,
        );
      }
    }
  }

  // Submission Reminder Processor - Runs every 5 minutes (Phase 4.5)
  @Cron('*/5 * * * *')
  async sendSubmissionReminders() {
    this.logger.log('CRON: Running Submission Reminder Processor');

    const workspaces = await this.prisma.workspace.findMany({
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, globalEmailPref: true, email: true },
            },
          },
        },
      },
    });

    for (const workspace of workspaces) {
      try {
        const localTime = DateTime.now().setZone(workspace.timezone);
        if (!localTime.isValid) continue;

        const workingDays = workspace.workingDays;
        if (!this.isWorkingDay(localTime, workingDays)) continue;

        const [endHour, endMinute] = workspace.standupWindowEnd
          .split(':')
          .map(Number);
        const windowCloseTime = localTime.set({
          hour: endHour,
          minute: endMinute,
          second: 0,
          millisecond: 0,
        });

        const thirtyMinsBefore = windowCloseTime.minus({ minutes: 30 });
        const twentyFiveMinsBefore = windowCloseTime.minus({ minutes: 25 });

        // Check if current time is exactly in the [T-30, T-25) window
        if (localTime >= thirtyMinsBefore && localTime < twentyFiveMinsBefore) {
          const startOfLocalDay = localTime.startOf('day').toJSDate();

          const submittedEntries = await this.prisma.standupEntry.findMany({
            where: {
              workspaceId: workspace.id,
              standupDate: startOfLocalDay,
            },
            select: { userId: true },
          });
          const submittedUserIds = new Set(
            submittedEntries.map((e) => e.userId),
          );

          const membersToRemind = workspace.members.filter(
            (m) => !submittedUserIds.has(m.userId),
          );

          for (const member of membersToRemind) {
            // In-app notification
            await this.notificationsService.createNotification(
              member.userId,
              'SUBMISSION_REMINDER',
              'Standup Reminder',
              `Your standup for ${workspace.name} is due in 30 minutes!`,
              workspace.id,
            );

            // Email check
            if (!member.isMuted && member.user.globalEmailPref !== 'OFF') {
              await this.emailQueue.add('send-reminder', {
                email: member.user.email,
                workspaceName: workspace.name,
                minutesRemaining: 30,
              });
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error sending reminders for workspace ${workspace.id}`,
          error,
        );
      }
    }
  }
}
