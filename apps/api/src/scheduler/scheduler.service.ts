import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ai-summary') private readonly aiSummaryQueue: Queue,
    @InjectQueue('ai-weekly-digest')
    private readonly aiWeeklyDigestQueue: Queue,
  ) {}

  // Jalankan setiap hari jam 17:00 UTC
  @Cron('0 17 * * *')
  async triggerDailySummaries() {
    this.logger.log('CRON: Triggering Daily Summaries for all workspaces...');
    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true },
    });
    const targetDate = new Date();

    for (const workspace of workspaces) {
      await this.aiSummaryQueue.add(
        'generate-daily-summary',
        { workspaceId: workspace.id, targetDate },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    }
  }

  // Jalankan setiap hari Jumat (5) jam 17:00 UTC
  @Cron('0 17 * * 5')
  async triggerWeeklyDigests() {
    this.logger.log('CRON: Triggering Weekly Digests for all workspaces...');
    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true },
    });
    const targetDate = new Date();

    for (const workspace of workspaces) {
      await this.aiWeeklyDigestQueue.add(
        'generate-weekly-digest',
        { workspaceId: workspace.id, targetDate },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    }
  }
}
