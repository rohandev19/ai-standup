import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { EventsGateway } from '../events/events.gateway';
import { HistoryQueryDto } from './dto/history-query.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      crypto.randomBytes(4).toString('hex')
    );
  }

  async getMyWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });
  }

  async createWorkspace(name: string, ownerId: string) {
    const slug = this.generateSlug(name);

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          members: {
            create: {
              userId: ownerId,
              role: 'OWNER',
            },
          },
          teams: {
            create: {
              name: 'General',
            },
          },
        },
      });
      return workspace;
    });
  }

  async findWorkspaceById(id: string) {
    return this.prisma.workspace.findUnique({ where: { id } });
  }

  async updateOnboarding(id: string, dto: UpdateOnboardingDto) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.update({
        where: { id },
        data: {
          ...dto,
          onboardingCompleted: true,
        },
      });

      // Log the onboarding completion
      await tx.auditLog.create({
        data: {
          workspaceId: id,
          action: 'workspace.onboarding_completed',
          metadataJson: JSON.parse(JSON.stringify(dto)),
        },
      });

      return workspace;
    });
  }

  async inviteMember(workspaceId: string, email: string, inviterId: string) {
    const workspace = await this.findWorkspaceById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
    });
    if (!inviter) throw new NotFoundException('Inviter not found');

    // Subscription Tier Checks
    if (workspace.subscriptionTier === 'FREE') {
      const activeMembersCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, isActive: true },
      });
      // Allow up to 5 members in FREE tier.
      if (activeMembersCount >= 5) {
        throw new BadRequestException(
          'Free tier is limited to 5 members. Please upgrade your subscription to invite more.',
        );
      }
    }

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existingUser.id },
        },
      });
      if (member) throw new BadRequestException('User is already a member');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Delete any pending invite for this email in this workspace
    await this.prisma.workspaceInvite.deleteMany({
      where: { workspaceId, email, usedAt: null },
    });

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email,
        token,
        invitedById: inviterId,
        expiresAt,
      },
    });

    // Trigger Email Queue to send the invite link
    await this.emailQueue.add('send-invite', {
      email,
      workspaceName: workspace.name,
      token,
      inviterName: inviter.name,
    });
    return { message: 'Invitation sent', inviteId: invite.id };
  }

  async bulkInviteMembers(
    workspaceId: string,
    inviterId: string,
    emails: string[],
  ) {
    const workspace = await this.findWorkspaceById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.subscriptionTier === 'FREE') {
      const activeMembersCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, isActive: true },
      });
      if (activeMembersCount + emails.length > 5) {
        throw new BadRequestException(
          'Free tier is limited to 5 members. Adding these members would exceed the limit. Please upgrade.',
        );
      }
    }

    const results = [];
    for (const email of emails) {
      try {
        const invite = await this.inviteMember(workspaceId, email, inviterId);
        results.push({ email, success: true, inviteId: invite.inviteId });
      } catch (error: any) {
        results.push({ email, success: false, error: error.message });
      }
    }
    return results;
  }

  async getHistory(workspaceId: string, query: HistoryQueryDto) {
    const { startDate, endDate, userId, keyword, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const userFilter = userId && userId !== 'All Members' ? { userId } : {};

    const keywordFilterStandup: Prisma.StandupEntryWhereInput = keyword
      ? {
          OR: [
            {
              yesterdayText: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              todayText: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              blockerText: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    const keywordFilterSummary: Prisma.AiSummaryWhereInput = keyword
      ? {
          content: { contains: keyword, mode: Prisma.QueryMode.insensitive },
        }
      : {};

    const keywordFilterDigest: Prisma.WeeklyDigestWhereInput = keyword
      ? {
          content: { contains: keyword, mode: Prisma.QueryMode.insensitive },
        }
      : {};

    const [standups, dailySummaries, weeklyDigests] = await Promise.all([
      this.prisma.standupEntry.findMany({
        where: {
          workspaceId,
          ...(Object.keys(dateFilter).length > 0 && {
            standupDate: dateFilter,
          }),
          ...userFilter,
          ...keywordFilterStandup,
        },
        include: { user: { select: { name: true, avatarUrl: true } } },
        orderBy: { standupDate: 'desc' },
      }),

      this.prisma.aiSummary.findMany({
        where: {
          workspaceId,
          ...(Object.keys(dateFilter).length > 0 && {
            summaryDate: dateFilter,
          }),
          ...keywordFilterSummary,
        },
        orderBy: { summaryDate: 'desc' },
      }),

      this.prisma.weeklyDigest.findMany({
        where: {
          workspaceId,
          ...(Object.keys(dateFilter).length > 0 && {
            weekEndDate: dateFilter,
          }),
          ...keywordFilterDigest,
        },
        orderBy: { weekEndDate: 'desc' },
      }),
    ]);

    // Map and interleave them
    const combined = [
      ...standups.map((s) => ({
        id: `standup_${s.id}`,
        type: 'standup',
        date: s.standupDate.toISOString().split('T')[0],
        member: s.user?.name || 'Unknown',
        time: s.submittedAt
          ? s.submittedAt.toTimeString().split(' ')[0].substring(0, 5)
          : '00:00',
        status: s.status.toLowerCase(),
        yesterday: s.yesterdayText,
        today: s.todayText,
        blocker: s.blockerText,
        originalDate: s.standupDate,
      })),
      ...dailySummaries.map((s) => ({
        id: `summary_${s.id}`,
        type: 'summary',
        date: s.summaryDate.toISOString().split('T')[0],
        content: s.content,
        metadata: {
          entryCount: s.entryCount,
          blockerCount: s.blockerCount,
          submissionRate: s.submissionRate,
        },
        originalDate: s.summaryDate,
      })),
      ...weeklyDigests.map((d) => ({
        id: `digest_${d.id}`,
        type: 'weekly_digest',
        date: d.weekEndDate.toISOString().split('T')[0],
        content: d.content,
        metadata: {
          totalEntries: d.totalEntries,
          totalBlockers: d.totalBlockers,
          resolvedBlockers: d.resolvedBlockers,
          avgSubmissionRate: d.avgSubmissionRate,
          topMissers: d.topMissers,
        },
        originalDate: d.weekEndDate,
      })),
    ];

    // Sort descending by date
    combined.sort(
      (a, b) => b.originalDate.getTime() - a.originalDate.getTime(),
    );

    // Paginate manually since we combined multiple tables
    const paginated = combined.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: {
        total: combined.length,
        page,
        limit,
        totalPages: Math.ceil(combined.length / limit),
      },
    };
  }

  async exportEntriesCsv(
    workspaceId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const workspace = await this.findWorkspaceById(workspaceId);
    if (workspace?.subscriptionTier !== 'ENTERPRISE') {
      throw new BadRequestException(
        'Export features are only available on the ENTERPRISE tier.',
      );
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const entries = await this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        ...(Object.keys(dateFilter).length > 0 && { standupDate: dateFilter }),
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { standupDate: 'desc' },
    });

    // Generate CSV string
    const header = 'Date,Name,Email,Status,Yesterday,Today,Blocker\n';
    const rows = entries.map((e) => {
      const escape = (text: string | null | undefined) =>
        text ? `"${text.replace(/"/g, '""')}"` : '';
      return `${e.standupDate.toISOString().split('T')[0]},${escape(e.user.name)},${escape(e.user.email)},${e.status},${escape(e.yesterdayText)},${escape(e.todayText)},${escape(e.blockerText)}`;
    });

    return header + rows.join('\n');
  }

  async exportSummariesCsv(
    workspaceId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const workspace = await this.findWorkspaceById(workspaceId);
    if (workspace?.subscriptionTier !== 'ENTERPRISE') {
      throw new BadRequestException(
        'Export features are only available on the ENTERPRISE tier.',
      );
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const summaries = await this.prisma.aiSummary.findMany({
      where: {
        workspaceId,
        ...(Object.keys(dateFilter).length > 0 && { summaryDate: dateFilter }),
      },
      orderBy: { summaryDate: 'desc' },
    });

    const header =
      'Date,Entries Count,Blockers Count,Submission Rate,Content\n';
    const rows = summaries.map((s) => {
      const escape = (text: string | null | undefined) =>
        text ? `"${text.replace(/"/g, '""')}"` : '';
      return `${s.summaryDate.toISOString().split('T')[0]},${s.entryCount || 0},${s.blockerCount || 0},${s.submissionRate || 0},${escape(s.content)}`;
    });

    return header + rows.join('\n');
  }

  async joinWorkspace(token: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite) throw new NotFoundException('Invalid invitation token');
    if (invite.usedAt) throw new BadRequestException('Invitation already used');
    if (invite.expiresAt < new Date())
      throw new BadRequestException('Invitation expired');

    // Ensure the user email matches the invite email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email !== invite.email) {
      throw new BadRequestException('Email does not match invitation');
    }

    // Add user as MEMBER and mark token as used
    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: 'MEMBER',
        },
      });

      // Find the inviter
      const inviter = await tx.user.findUnique({
        where: { id: invite.invitedById },
      });
      if (inviter) {
        await this.notificationsService.createNotification(
          inviter.id,
          'INVITE_ACCEPTED',
          'Invitation Accepted',
          `${user.name} has accepted your invitation to join the workspace.`,
          invite.workspaceId,
          { acceptedUserId: userId },
        );

        if (inviter.globalEmailPref !== 'OFF') {
          // Send email Notification to inviter
          await this.emailQueue.add('send-notification', {
            email: inviter.email,
            workspaceName: invite.workspaceId,
            title: 'Invitation Accepted',
            body: `${user.name} has joined your workspace!`,
          });
        }
      }

      return membership;
    });
  }
}
