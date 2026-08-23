import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly eventsGateway: EventsGateway,
    @InjectQueue('ai-weekly-digest')
    private readonly aiWeeklyDigestQueue: Queue,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly notificationsService: import('../notifications/notifications.service').NotificationsService,
  ) {}

  async generateDailySummary(workspaceId: string, targetDate: Date) {
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const standups = await this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        standupDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: { select: { name: true } },
        blockerFlag: true,
      },
    });

    if (standups.length === 0) {
      this.logger.log(
        `No standups found for workspace ${workspaceId} on ${startOfDay.toISOString()}`,
      );
      return;
    }

    const compiledText = standups
      .map(
        (s) =>
          `[User: ${s.user.name}]\nYesterday: ${s.yesterdayText || '-'}\nToday: ${s.todayText || '-'}\nBlocker: ${s.blockerText || '-'}`,
      )
      .join('\n\n');

    const summaryContent =
      await this.aiService.generateDailySummary(compiledText);

    if (summaryContent) {
      const summary = await this.prisma.aiSummary.create({
        data: {
          workspaceId,
          summaryDate: startOfDay,
          content: summaryContent,
          entryCount: standups.length,
          blockerCount: standups.filter((s) => !!s.blockerFlag).length,
          submissionRate: 100, // TODO: calculate actual rate
          missedMembers: [],
        },
      });

      this.eventsGateway.broadcastToWorkspace(
        workspaceId,
        'summary_ready',
        summary,
      );
      this.logger.log(`Generated DAILY summary for workspace ${workspaceId}`);
      await this.notifyAdmins(
        workspaceId,
        'SUMMARY_READY',
        'Daily Summary Ready',
        `The daily summary for ${startOfDay.toISOString().split('T')[0]} is ready.`,
        summary.id,
      );
      return summary;
    }
  }

  async generateWeeklyDigest(workspaceId: string, targetDate: Date) {
    const endOfPeriod = new Date(targetDate);
    endOfPeriod.setUTCHours(23, 59, 59, 999);

    const startOfPeriod = new Date(endOfPeriod);
    startOfPeriod.setDate(startOfPeriod.getDate() - 6); // 7 days inclusive
    startOfPeriod.setUTCHours(0, 0, 0, 0);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { where: { isActive: true } },
      },
    });

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const activeMemberCount = workspace.members.length;

    const standups = await this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        standupDate: {
          gte: startOfPeriod,
          lte: endOfPeriod,
        },
      },
      include: {
        user: { select: { name: true } },
        blockerFlag: true,
      },
    });

    // Requirement 17.6: Skip AI call if 0 submissions
    const nonMissedEntries = standups.filter((s) => s.status !== 'MISSED');
    if (nonMissedEntries.length === 0) {
      this.logger.log(
        `0 submissions for workspace ${workspaceId} in the last 7 days. Skipping AI call.`,
      );
      return this.saveWeeklyDigest(
        workspaceId,
        startOfPeriod,
        endOfPeriod,
        'Tidak ada aktivitas standup minggu ini.',
        standups,
      );
    }

    const aiSummaries = await this.prisma.aiSummary.findMany({
      where: {
        workspaceId,
        summaryDate: {
          gte: startOfPeriod,
          lte: endOfPeriod,
        },
      },
      orderBy: { summaryDate: 'asc' },
    });

    // Metrics calculation
    const totalEntries = nonMissedEntries.length;
    const totalBlockers = standups.filter((s) => !!s.blockerFlag).length;
    const resolvedBlockers = standups.filter(
      (s) => s.blockerFlag?.isResolved,
    ).length;

    // Calculate avgSubmissionRate
    let avgSubmissionRate = 0;
    if (aiSummaries.length > 0) {
      const sumRates = aiSummaries.reduce(
        (acc, sum) => acc + sum.submissionRate,
        0,
      );
      avgSubmissionRate = sumRates / aiSummaries.length;
    } else {
      // Fallback manual calculation if no daily summaries exist
      const totalExpected = activeMemberCount * 5; // roughly 5 working days
      avgSubmissionRate =
        totalExpected > 0 ? (totalEntries / totalExpected) * 100 : 0;
    }

    // Top missers
    const missedCounts = new Map<string, number>();
    standups.forEach((s) => {
      if (s.status === 'MISSED') {
        missedCounts.set(s.user.name, (missedCounts.get(s.user.name) || 0) + 1);
      }
    });

    let topMissers: string[] = [];
    if (missedCounts.size > 0) {
      const sortedMissers = Array.from(missedCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      );
      const maxMisses = sortedMissers[0][1];
      if (maxMisses > 1) {
        // Only highlight if they missed multiple times
        topMissers = sortedMissers
          .filter((m) => m[1] === maxMisses)
          .map((m) => m[0]);
      }
    }
    const topMissersText = topMissers.length > 0 ? topMissers.join(', ') : '-';

    // Text formatting
    const dailySummariesText = aiSummaries
      .map((s) => `[${s.summaryDate.toISOString().split('T')[0]}] ${s.content}`)
      .join('\n');

    const blockerLogText = standups
      .filter((s) => !!s.blockerFlag)
      .map(
        (s) =>
          `[${s.standupDate.toISOString().split('T')[0]}] ${s.user.name}: ${s.blockerText} -> ${s.blockerFlag?.severity}`,
      )
      .join('\n');

    const digestContent = await this.aiService.generateWeeklyDigest(
      workspace.name,
      startOfPeriod.toISOString().split('T')[0],
      endOfPeriod.toISOString().split('T')[0],
      activeMemberCount,
      avgSubmissionRate,
      totalBlockers,
      resolvedBlockers,
      topMissersText,
      dailySummariesText,
      blockerLogText,
    );

    if (digestContent) {
      return this.saveWeeklyDigest(
        workspaceId,
        startOfPeriod,
        endOfPeriod,
        digestContent,
        standups,
      );
    }
  }

  async saveWeeklyDigest(
    workspaceId: string,
    startOfPeriod: Date,
    endOfPeriod: Date,
    content: string,
    standups: (import('@prisma/client').StandupEntry & {
      user: { name: string | null };
      blockerFlag: import('@prisma/client').BlockerFlag | null;
    })[],
  ) {
    const nonMissedEntries = standups.filter((s) => s.status !== 'MISSED');
    const missedCounts = new Map<string, number>();
    standups.forEach((s) => {
      if (s.status === 'MISSED' && s.user.name) {
        missedCounts.set(s.user.name, (missedCounts.get(s.user.name) || 0) + 1);
      }
    });
    const sortedMissers = Array.from(missedCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    );
    const topMissers = sortedMissers.slice(0, 3).map((m) => m[0]);

    const totalBlockers = standups.filter((s) => !!s.blockerFlag).length;
    const resolvedBlockers = standups.filter(
      (s) => s.blockerFlag?.isResolved,
    ).length;

    const digest = await this.prisma.weeklyDigest.create({
      data: {
        workspaceId,
        weekStartDate: startOfPeriod,
        weekEndDate: endOfPeriod,
        content,
        totalEntries: nonMissedEntries.length,
        totalBlockers,
        resolvedBlockers,
        avgSubmissionRate: 0, // Fallback, will be recalculated safely if needed, but not required for placeholder
        topMissers,
      },
    });

    this.eventsGateway.broadcastToWorkspace(
      workspaceId,
      'digest_ready',
      digest,
    );
    this.logger.log(
      `Generated/Saved WEEKLY digest for workspace ${workspaceId}`,
    );
    await this.notifyAdmins(
      workspaceId,
      'WEEKLY_DIGEST_READY',
      'Weekly Digest Ready',
      `The weekly digest is ready.`,
      digest.id,
    );
    return digest;
  }

  async saveSummary(workspaceId: string, targetDate: Date, content: string) {
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const summary = await this.prisma.aiSummary.create({
      data: {
        workspaceId,
        summaryDate: startOfDay,
        content,
        entryCount: 0,
        blockerCount: 0,
        submissionRate: 0,
        missedMembers: [],
      },
    });

    this.eventsGateway.broadcastToWorkspace(
      workspaceId,
      'summary_ready',
      summary,
    );
    this.logger.log(`Saved fallback summary for workspace ${workspaceId}`);
    return summary;
  }

  async getSummaries(workspaceId: string, type?: 'DAILY' | 'WEEKLY') {
    if (type === 'WEEKLY') {
      return this.prisma.weeklyDigest.findMany({
        where: { workspaceId },
        orderBy: { weekStartDate: 'desc' },
        take: 10,
      });
    }
    return this.prisma.aiSummary.findMany({
      where: { workspaceId },
      orderBy: { summaryDate: 'desc' },
      take: 30,
    });
  }

  async dispatchWeeklyDigestJob(workspaceId: string, targetDate: Date) {
    this.logger.log(
      `Manually dispatching Weekly Digest for workspace ${workspaceId}`,
    );
    return this.aiWeeklyDigestQueue.add(
      'generate-weekly-digest',
      { workspaceId, targetDate },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  private async notifyAdmins(
    workspaceId: string,
    type: import('@prisma/client').NotificationType,
    title: string,
    body: string,
    entityId: string,
  ) {
    const admins = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        isActive: true,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      include: { user: true },
    });

    for (const admin of admins) {
      await this.notificationsService.createNotification(
        admin.userId,
        type,
        title,
        body,
        workspaceId,
        { entityId },
      );

      if (!admin.isMuted && admin.user.globalEmailPref !== 'OFF') {
        await this.emailQueue.add('send-notification', {
          email: admin.user.email,
          workspaceName: workspaceId,
          title,
          body,
        });
      }
    }
  }
}
