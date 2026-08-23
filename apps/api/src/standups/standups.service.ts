import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class StandupsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ai-blocker') private aiBlockerQueue: Queue,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async submitStandup(
    workspaceId: string,
    userId: string,
    yesterdayText: string | undefined,
    todayText: string | undefined,
    blockerText: string | undefined,
  ) {
    // 1. Get current date (UTC normalized to Date)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 2. Prevent duplicate submission for the same date (Requirement 5.2)
    const existing = await this.prisma.standupEntry.findUnique({
      where: {
        workspaceId_userId_standupDate: {
          workspaceId,
          userId,
          standupDate: today,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already submitted a standup for today',
      );
    }

    // 3. Determine status based on blocker text
    const hasBlocker = Boolean(blockerText && blockerText.trim().length > 0);
    const status = hasBlocker ? 'PENDING_AI' : 'SUBMITTED';

    // 4. Create Entry
    const entry = await this.prisma.standupEntry.create({
      data: {
        workspaceId,
        userId,
        standupDate: today,
        yesterdayText,
        todayText,
        blockerText,
        status,
        submittedAt: new Date(),
      },
    });

    // 5. Enqueue AI processing if needed
    if (hasBlocker) {
      await this.aiBlockerQueue.add('extract-blockers', {
        standupId: entry.id,
        blockerText,
      });
    }

    // 6. Broadcast real-time presence update (Phase 5)
    this.eventsGateway.broadcastToWorkspace(workspaceId, 'presence_update', {
      userId,
      status,
    });

    return entry;
  }

  async editStandup(
    workspaceId: string,
    userId: string,
    entryId: string,
    data: { yesterdayText?: string; todayText?: string; blockerText?: string },
  ) {
    const entry = await this.prisma.standupEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Standup entry not found');
    if (entry.workspaceId !== workspaceId || entry.userId !== userId) {
      throw new ForbiddenException('You can only edit your own standup');
    }

    // TODO: Verify if within grace period (Requirement 6.3 - edits allowed before window closes)
    // For now, we allow simple edits. If blocker text changes, we might need to re-run AI.
    const hasNewBlocker = Boolean(
      data.blockerText && data.blockerText.trim().length > 0,
    );
    const status = hasNewBlocker ? 'PENDING_AI' : 'SUBMITTED';

    const updated = await this.prisma.standupEntry.update({
      where: { id: entryId },
      data: {
        ...data,
        status,
        editedAt: new Date(),
      },
    });

    if (hasNewBlocker && data.blockerText !== entry.blockerText) {
      // Re-run AI analysis
      // Delete existing blockers
      await this.prisma.blockerFlag.deleteMany({
        where: { standupEntryId: entryId },
      });
      await this.aiBlockerQueue.add('extract-blockers', {
        standupId: entryId,
        blockerText: data.blockerText,
      });
    }

    return updated;
  }

  async getWorkspaceStandups(workspaceId: string, dateStr: string) {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    return this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        standupDate: date,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        blockerFlag: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async resolveBlocker(
    workspaceId: string,
    blockerId: string,
    resolvedByUserId: string,
  ) {
    const blocker = await this.prisma.blockerFlag.findUnique({
      where: { id: blockerId },
      include: { standupEntry: true },
    });

    if (!blocker) {
      throw new NotFoundException('Blocker not found');
    }

    if (blocker.standupEntry.workspaceId !== workspaceId) {
      throw new ForbiddenException('Blocker does not belong to this workspace');
    }

    if (blocker.isResolved) {
      throw new BadRequestException('Blocker is already resolved');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.blockerFlag.update({
        where: { id: blockerId },
        data: {
          isResolved: true,
          resolvedById: resolvedByUserId,
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: resolvedByUserId,
          action: 'blocker.resolved',
          entityType: 'BlockerFlag',
          entityId: blockerId,
          metadataJson: {
            standupEntryId: blocker.standupEntryId,
          },
        },
      });

      return updated;
    });
  }
}
