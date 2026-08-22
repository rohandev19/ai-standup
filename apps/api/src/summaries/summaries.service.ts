import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly eventsGateway: EventsGateway,
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
        'new_daily_summary',
        summary,
      );
      this.logger.log(`Generated DAILY summary for workspace ${workspaceId}`);
      return summary;
    }
  }

  async generateWeeklyDigest(workspaceId: string, targetDate: Date) {
    const endOfPeriod = new Date(targetDate);
    endOfPeriod.setUTCHours(23, 59, 59, 999);

    const startOfPeriod = new Date(endOfPeriod);
    startOfPeriod.setDate(startOfPeriod.getDate() - 7);
    startOfPeriod.setUTCHours(0, 0, 0, 0);

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

    if (standups.length === 0) {
      this.logger.log(
        `No standups found for workspace ${workspaceId} in the last 7 days`,
      );
      return;
    }

    const compiledText = standups
      .map(
        (s) =>
          `[Date: ${s.standupDate.toISOString().split('T')[0]} | User: ${s.user.name}]\nYesterday: ${s.yesterdayText || '-'}\nToday: ${s.todayText || '-'}\nBlocker: ${s.blockerText || '-'}`,
      )
      .join('\n\n');

    const digestContent =
      await this.aiService.generateWeeklyDigest(compiledText);

    if (digestContent) {
      const digest = await this.prisma.weeklyDigest.create({
        data: {
          workspaceId,
          weekStartDate: startOfPeriod,
          weekEndDate: endOfPeriod,
          content: digestContent,
          totalEntries: standups.length,
          totalBlockers: standups.filter((s) => !!s.blockerFlag).length,
          resolvedBlockers: standups.filter((s) => s.blockerFlag?.isResolved)
            .length,
          avgSubmissionRate: 100,
          topMissers: [],
        },
      });

      this.eventsGateway.broadcastToWorkspace(
        workspaceId,
        'new_weekly_digest',
        digest,
      );
      this.logger.log(`Generated WEEKLY digest for workspace ${workspaceId}`);
      return digest;
    }
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
}
