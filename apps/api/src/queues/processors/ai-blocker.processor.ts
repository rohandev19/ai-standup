import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { EventsGateway } from '../../events/events.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('ai-blocker')
export class AiBlockerProcessor extends WorkerHost {
  private readonly logger = new Logger(AiBlockerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly eventsGateway: EventsGateway,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(
    job: Job<{ standupId: string; blockerText: string }, any, string>,
  ): Promise<void> {
    this.logger.log(
      `Processing ai-blocker job ${job.id} for standup ${job.data.standupId}`,
    );

    const { standupId, blockerText } = job.data;

    try {
      // Panggil AI Service
      const extractedBlocker =
        await this.aiService.extractBlockers(blockerText);

      // Mulai transaksi database
      const blockerFlag = await this.prisma.$transaction(async (tx) => {
        let createdBlockerFlag = null;
        if (extractedBlocker) {
          // Buat entri BlockerFlag (hanya 1)
          createdBlockerFlag = await tx.blockerFlag.create({
            data: {
              standupEntryId: standupId,
              severity: extractedBlocker.severity,
              reason: extractedBlocker.reason,
            },
          });
        }

        // Tandai status standup menjadi SUBMITTED
        await tx.standupEntry.update({
          where: { id: standupId },
          data: { status: 'SUBMITTED' },
        });

        return createdBlockerFlag;
      });

      if (blockerFlag && blockerFlag.severity === 'HIGH') {
        const entry = await this.prisma.standupEntry.findUnique({
          where: { id: standupId },
          select: { workspaceId: true },
        });
        if (entry) {
          this.eventsGateway.broadcastToWorkspace(
            entry.workspaceId,
            'blocker_alert',
            blockerFlag,
          );
          await this.notifyAdmins(
            entry.workspaceId,
            'BLOCKER_ALERT',
            'High Severity Blocker Detected',
            `A new HIGH severity blocker was reported.`,
            blockerFlag.id,
          );
        }
      }

      this.logger.log(
        `Successfully processed AI blocker for standup ${standupId}`,
      );
    } catch (error) {
      const maxAttempts = job.opts.attempts || 3;
      if (job.attemptsMade >= maxAttempts - 1) {
        this.logger.warn(
          `Final attempt failed for AI blocker standup ${standupId}. Applying graceful fallback.`,
        );
        // Fallback: simpan raw text TANPA severity/badge AI
        await this.prisma.$transaction(async (tx) => {
          await tx.blockerFlag.create({
            data: {
              standupEntryId: standupId,
              severity: 'LOW', // We must provide a severity according to DB schema, but we will mark reason differently
              reason: `[AI Fallback] ${blockerText.substring(0, 500)}`,
            },
          });
          await tx.standupEntry.update({
            where: { id: standupId },
            data: { status: 'SUBMITTED' },
          });
        });
        return; // Complete job successfully to avoid dead-letter if we handled it gracefully
      }

      if (error instanceof Error) {
        this.logger.error(
          `Failed to process AI blocker for standup ${standupId}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to process AI blocker for standup ${standupId}`,
          error,
        );
      }
      // Let BullMQ handle retries
      throw error;
    }
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
