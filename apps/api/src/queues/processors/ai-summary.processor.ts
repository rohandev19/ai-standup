import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SummariesService } from '../../summaries/summaries.service';

@Processor('ai-summary')
export class AiSummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(AiSummaryProcessor.name);

  constructor(private readonly summariesService: SummariesService) {
    super();
  }

  async process(
    job: Job<{ workspaceId: string; targetDate: Date }, any, string>,
  ): Promise<any> {
    this.logger.log(
      `Processing ai-summary job ${job.id} for workspace ${job.data.workspaceId}`,
    );
    try {
      const summary = await this.summariesService.generateDailySummary(
        job.data.workspaceId,
        new Date(job.data.targetDate),
      );
      this.logger.log(
        `Successfully completed ai-summary for workspace ${job.data.workspaceId}`,
      );
      return summary;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to process ai-summary for workspace ${job.data.workspaceId}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to process ai-summary for workspace ${job.data.workspaceId}`,
          error,
        );
      }
      throw error;
    }
  }
}
