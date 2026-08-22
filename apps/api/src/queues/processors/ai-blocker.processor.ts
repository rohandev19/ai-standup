import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';

@Processor('ai-blocker')
export class AiBlockerProcessor extends WorkerHost {
  private readonly logger = new Logger(AiBlockerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
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
      await this.prisma.$transaction(async (tx) => {
        if (extractedBlocker) {
          // Buat entri BlockerFlag (hanya 1)
          await tx.blockerFlag.create({
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
      });

      this.logger.log(
        `Successfully processed AI blocker for standup ${standupId}`,
      );
    } catch (error) {
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
}
