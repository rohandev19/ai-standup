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
    this.logger.log('=== EmailProcessor Constructor Called ===');
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      const port = parseInt(process.env.SMTP_PORT || '465', 10);
      const transportOptions: nodemailer.TransportOptions & {
        host: string;
        port: number;
        secure: boolean;
        auth?: { user: string; pass: string };
      } = {
        host: smtpHost,
        port,
        secure: port === 465, // true for 465 (Gmail etc), false for 1025 (Mailpit) and 587
      };

      // Only add auth if credentials are provided (Mailpit doesn't need them)
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        transportOptions.auth = {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        };
      }

      this.transporter = nodemailer.createTransport(transportOptions);
      this.logger.log(
        `Nodemailer transporter configured: ${smtpHost}:${port} (secure=${port === 465}, auth=${!!transportOptions.auth})`,
      );
    } else {
      this.logger.warn('No SMTP_HOST configured. Emails will be mocked.');
    }
  }


  async process(job: Job<EmailJobData, any, string>): Promise<void> {
    this.logger.log(`=== Processing email job ${job.id} of type ${job.name} ===`);
    this.logger.log(`Job data: ${JSON.stringify(job.data)}`);

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
        case 'send-verification':
          subject = 'Verify Your Email Address';
          text = `Welcome! Please verify your email address by clicking this link: ${process.env.FRONTEND_URL}/verify-email/${job.data.token}\n\nThis link will expire in 24 hours.`;
          break;
        case 'send-password-reset':
          subject = 'Reset Your Password';
          text = `You requested to reset your password. Click this link to reset it: ${process.env.FRONTEND_URL}/reset-password?token=${job.data.token}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`;
          break;
        default:
          this.logger.warn(`Unknown email job type: ${job.name}`);
          return;
      }

      if (this.transporter) {
        // Send real email
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@aistandup.com',
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
      this.logger.error(`Failed to process email job ${job.id}`);
      this.logger.error(`Error details: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      this.logger.error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      throw error;
    }
  }
}
