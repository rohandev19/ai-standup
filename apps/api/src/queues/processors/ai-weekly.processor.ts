import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SummariesService } from '../../summaries/summaries.service';

@Processor('ai-weekly-digest')
export class AiWeeklyDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(AiWeeklyDigestProcessor.name);

  constructor(private readonly summariesService: SummariesService) {
    super();
  }

  async process(
    job: Job<{ workspaceId: string; targetDate: Date }, any, string>,
  ): Promise<any> {
    this.logger.log(
      `Processing ai-weekly-digest job ${job.id} for workspace ${job.data.workspaceId}`,
    );
    try {
      const digest = await this.summariesService.generateWeeklyDigest(
        job.data.workspaceId,
        new Date(job.data.targetDate),
      );
      this.logger.log(
        `Successfully completed ai-weekly-digest for workspace ${job.data.workspaceId}`,
      );
      return digest;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to process ai-weekly-digest for workspace ${job.data.workspaceId}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to process ai-weekly-digest for workspace ${job.data.workspaceId}`,
          error,
        );
      }
      throw error;
    }
  }
}
