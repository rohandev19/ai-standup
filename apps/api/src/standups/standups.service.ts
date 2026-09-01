import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DateTime } from 'luxon';

@Injectable()
export class StandupsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ai-blocker') private aiBlockerQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submitStandup(
    workspaceId: string,
    userId: string,
    yesterdayText: string | undefined,
    todayText: string | undefined,
    blockerText: string | undefined,
  ) {
    // 1. Get current date (UTC normalized to Date)
    const localTime = DateTime.now().setZone(workspace.timezone);
    const today = localTime.startOf('day').toJSDate();

    // 2. Prevent duplicate submission for the same date (Requirement 5.2)
    const existing = await this.prisma.standupEntry.findUnique({
      where: {
        workspaceId_userId_standupDate: {
          workspaceId,
          userId,
          standupDate: today,
        },
      },
    });

    if (existing) {
      if (existing.status !== 'MISSED') {
        throw new BadRequestException(
          'You have already submitted a standup for today',
        );
      }
    }

    // 3. Determine status based on blocker text
    const hasBlocker = Boolean(blockerText && blockerText.trim().length > 0);
    const status = hasBlocker
      ? 'PENDING_AI'
      : existing && existing.status === 'MISSED'
        ? 'LATE'
        : 'SUBMITTED';

    let entry;

    if (existing) {
      // Update the automatically created MISSED entry (Late submission)
      entry = await this.prisma.standupEntry.update({
        where: { id: existing.id },
        data: {
          yesterdayText,
          todayText,
          blockerText,
          status,
          submittedAt: new Date(),
        },
      });
    } else {
      // 4. Create Entry
      entry = await this.prisma.standupEntry.create({
        data: {
          workspaceId,
          userId,
          standupDate: today,
          yesterdayText,
          todayText,
          blockerText,
          status,
          submittedAt: new Date(),
        },
      });
    }

    // 5. Enqueue AI processing if needed
    if (hasBlocker) {
      await this.aiBlockerQueue.add('extract-blockers', {
        standupId: entry.id,
        blockerText,
      });
    }

    // 6. Broadcast real-time presence update (Phase 5)
    this.eventEmitter.emit('standup.submitted', {
      workspaceId,
      userId,
      status,
    });

    return entry;
  }

  async editStandup(
    workspaceId: string,
    userId: string,
    entryId: string,
    data: { yesterdayText?: string; todayText?: string; blockerText?: string },
  ) {
    const entry = await this.prisma.standupEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Standup entry not found');
    if (entry.workspaceId !== workspaceId || entry.userId !== userId) {
      throw new ForbiddenException('You can only edit your own standup');
    }

    // TODO: Verify if within grace period (Requirement 6.3 - edits allowed before window closes)
    // For now, we allow simple edits. If blocker text changes, we might need to re-run AI.
    const hasNewBlocker = Boolean(
      data.blockerText && data.blockerText.trim().length > 0,
    );
    const status = hasNewBlocker ? 'PENDING_AI' : 'SUBMITTED';

    const updated = await this.prisma.standupEntry.update({
      where: { id: entryId },
      data: {
        ...data,
        status,
        editedAt: new Date(),
      },
    });

    if (hasNewBlocker && data.blockerText !== entry.blockerText) {
      // Re-run AI analysis
      // Delete existing blockers
      await this.prisma.blockerFlag.deleteMany({
        where: { standupEntryId: entryId },
      });
      await this.aiBlockerQueue.add('extract-blockers', {
        standupId: entryId,
        blockerText: data.blockerText,
      });
    }

    return updated;
  }

  async getDashboardState(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    const localTime = DateTime.now().setZone(workspace.timezone);
    const today = localTime.startOf('day').toJSDate();

    const standups = await this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        standupDate: today,
      },
      include: {
        blockerFlag: true,
      },
    });

    // Window Status Logic (mirroring Scheduler)
    const dayOfWeek = localTime.weekday; // 1 = Monday, 7 = Sunday
    const isWorkingDay = workspace.workingDays.includes(dayOfWeek);

    let windowStatus: 'open' | 'closed' = 'closed';
    let windowRemaining = '0m';

    if (isWorkingDay) {
      const [startHour, startMinute] = workspace.standupWindowStart
        .split(':')
        .map(Number);
      const [endHour, endMinute] = workspace.standupWindowEnd
        .split(':')
        .map(Number);

      const windowStartTime = localTime.set({
        hour: startHour,
        minute: startMinute,
        second: 0,
        millisecond: 0,
      });
      const windowEndTime = localTime.set({
        hour: endHour,
        minute: endMinute,
        second: 0,
        millisecond: 0,
      });

      if (localTime >= windowStartTime && localTime <= windowEndTime) {
        windowStatus = 'open';
        const diffInMinutes = windowEndTime.diff(localTime, 'minutes').minutes;
        if (diffInMinutes > 60) {
          const hours = Math.floor(diffInMinutes / 60);
          const mins = Math.floor(diffInMinutes % 60);
          windowRemaining = `${hours}h ${mins}m`;
        } else {
          windowRemaining = `${Math.floor(diffInMinutes)}m`;
        }
      }
    }

    // Map members to their status
    const members = workspace.members.map((member) => {
      const entry = standups.find((s) => s.userId === member.userId);
      let status = 'not_yet';
      let time = null;
      let yesterday = null;
      let todayText = null;
      let blocker = null;

      if (entry) {
        status = entry.status === 'MISSED' ? 'missed' : 'submitted'; // we ignore 'late' for simple UI
        const submittedLocal = DateTime.fromJSDate(
          entry.submittedAt || new Date(),
        ).setZone(workspace.timezone);
        time = submittedLocal.toFormat('HH:mm');
        yesterday = entry.yesterdayText;
        todayText = entry.todayText;
        if (entry.blockerFlag) {
          blocker = {
            id: entry.blockerFlag.id,
            text: entry.blockerText,
            isResolved: entry.blockerFlag.isResolved,
          };
        }
      } else if (windowStatus === 'closed') {
        status = 'missed';
      }

      return {
        id: member.userId,
        name: member.user.name,
        avatarUrl: member.user.avatarUrl,
        status,
        time,
        yesterday,
        today: todayText,
        blocker,
      };
    });

    const activeBlockers = standups.reduce(
      (acc, s) => acc + (s.blockerFlag && !s.blockerFlag.isResolved ? 1 : 0),
      0,
    );

    return {
      stats: {
        submitted: standups.length,
        totalMembers: workspace.members.length,
        activeBlockers,
        windowStatus,
        windowRemaining,
      },
      members,
    };
  }

  async getWorkspaceStandups(workspaceId: string, dateStr: string) {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    return this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        standupDate: date,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        blockerFlag: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async resolveBlocker(
    workspaceId: string,
    blockerId: string,
    resolvedByUserId: string,
  ) {
    const blocker = await this.prisma.blockerFlag.findUnique({
      where: { id: blockerId },
      include: { standupEntry: true },
    });

    if (!blocker) {
      throw new NotFoundException('Blocker not found');
    }

    if (blocker.standupEntry.workspaceId !== workspaceId) {
      throw new ForbiddenException('Blocker does not belong to this workspace');
    }

    if (blocker.isResolved) {
      throw new BadRequestException('Blocker is already resolved');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.blockerFlag.update({
        where: { id: blockerId },
        data: {
          isResolved: true,
          resolvedById: resolvedByUserId,
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: resolvedByUserId,
          action: 'blocker.resolved',
          entityType: 'BlockerFlag',
          entityId: blockerId,
          metadataJson: {
            standupEntryId: blocker.standupEntryId,
          },
        },
      });

      return updated;
    });
  }

  async getUserStandups(workspaceId: string, userId: string) {
    return this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        userId,
      },
      orderBy: { standupDate: 'desc' },
      take: 30, // Get the last 30 days of standups
    });
  }
}
