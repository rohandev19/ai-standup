import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    super();
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log('Nodemailer transporter configured with real SMTP.');
    } else {
      this.logger.warn('No SMTP configuration found. Emails will be mocked.');
    }
  }

  async process(job: Job<EmailJobData, any, string>): Promise<void> {
    this.logger.log(`Processing email job ${job.id} of type ${job.name}`);

    try {
      let subject = '';
      let text = '';
      const html = '';

      switch (job.name) {
        case 'send-reminder':
          subject = `Standup Reminder for ${job.data.workspaceName}`;
          text = `Friendly reminder! You have ${job.data.minutesRemaining} minutes remaining to submit your standup in ${job.data.workspaceName}.`;
          break;
        case 'send-notification':
          subject = `${job.data.title}`;
          text = `${job.data.body}`;
          break;
        case 'send-invite':
          subject = `You are invited to join ${job.data.workspaceName}`;
          text = `${job.data.inviterName} has invited you to join ${job.data.workspaceName}. Use this code to join: ${job.data.token}`;
          break;
        default:
          this.logger.warn(`Unknown email job type: ${job.name}`);
          return;
      }

      if (this.transporter) {
        // Send real email
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: job.data.email,
          subject,
          text,
          html: html || text,
        };
        await this.transporter.sendMail(mailOptions);
        this.logger.log(
          `[REAL EMAIL] Sent to: ${job.data.email}, Subject: ${subject}`,
        );
      } else {
        // Mock email
        this.logger.log(
          `[MOCK EMAIL] To: ${job.data.email}, Subject: ${subject}`,
        );
        this.logger.log(`[MOCK EMAIL CONTENT] ${text}`);
      }

      this.logger.log(`Successfully processed email job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}`, error);
      throw error;
    }
  }
}
