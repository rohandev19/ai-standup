import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

type EmailJobData = {
  email: string;
  workspaceName?: string;
  minutesRemaining?: number;
  title?: string;
  body?: string;
  inviterName?: string;
  token?: string;
};

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData, any, string>): Promise<void> {
    this.logger.log(`Processing email job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'send-reminder':
          this.logger.log(
            `[MOCK EMAIL] To: ${job.data.email}, Subject: Standup Reminder, Workspace: ${job.data.workspaceName}, Minutes Remaining: ${job.data.minutesRemaining}`,
          );
          break;
        case 'send-notification':
          this.logger.log(
            `[MOCK EMAIL] To: ${job.data.email}, Subject: ${job.data.title}, Workspace: ${job.data.workspaceName}, Body: ${job.data.body}`,
          );
          break;
        case 'send-invite':
          this.logger.log(
            `[MOCK EMAIL] To: ${job.data.email}, Subject: You are invited to join ${job.data.workspaceName} by ${job.data.inviterName}. Token: ${job.data.token}`,
          );
          break;
        default:
          this.logger.warn(`Unknown email job type: ${job.name}`);
      }
      this.logger.log(`Successfully processed email job ${job.id}`);

      // Keep compiler happy about async
      await Promise.resolve();
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}`, error);
      throw error;
    }
  }
}
