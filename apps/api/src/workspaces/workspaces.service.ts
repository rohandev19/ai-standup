import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
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
    const joinCode = crypto.randomBytes(4).toString('hex');
    const joinPassword = crypto.randomBytes(4).toString('hex');

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          joinCode,
          joinPassword,
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
          metadataJson: JSON.parse(
            JSON.stringify(dto),
          ) as Prisma.InputJsonValue,
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

    // Check if there is already a pending invite
    const existingInvite = await this.prisma.workspaceInvite.findFirst({
      where: { workspaceId, email, usedAt: null },
    });

    if (existingInvite) {
      await this.emailQueue.add('send-invite', {
        email,
        workspaceName: workspace.name,
        token: existingInvite.token,
        inviterName: inviter.name,
      });
      return { message: 'Invitation resent', inviteId: existingInvite.id };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.workspaceInvite.create({
        data: {
          workspaceId,
          email,
          token,
          invitedById: inviterId,
          expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: inviterId,
          action: 'invite.sent',
          entityType: 'WorkspaceInvite',
          entityId: invite.id,
          metadataJson: { email },
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
    });
  }

  async resendInvite(workspaceId: string, inviteId: string, inviterId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.workspaceId !== workspaceId)
      throw new BadRequestException('Invalid workspace');
    if (invite.usedAt) throw new BadRequestException('Invite already used');

    const workspace = await this.findWorkspaceById(workspaceId);
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
    });

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { token: newToken, expiresAt: newExpiresAt },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: inviterId,
          action: 'invite.sent',
          entityType: 'WorkspaceInvite',
          entityId: invite.id,
          metadataJson: { email: invite.email, resend: true },
        },
      });

      await this.emailQueue.add('send-invite', {
        email: invite.email,
        workspaceName: workspace?.name,
        token: newToken,
        inviterName: inviter?.name,
      });

      return { message: 'Invitation resent', inviteId: invite.id };
    });
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
      } catch (error) {
        const e = error as Error;
        results.push({ email, success: false, error: e.message });
      }
    }
    return results;
  }

  async joinWithCode(userId: string, joinCode: string, joinPassword: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { joinCode },
    });

    if (!workspace) throw new NotFoundException('Invalid Room Code');
    if (workspace.joinPassword !== joinPassword)
      throw new BadRequestException('Invalid Password');

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId },
      },
    });

    if (existingMember) {
      if (!existingMember.isActive) {
        // Reactivate
        await this.prisma.workspaceMember.update({
          where: { id: existingMember.id },
          data: { isActive: true, joinedAt: new Date(), leftAt: null },
        });
      }
      return {
        message: 'Successfully joined workspace',
        workspaceId: workspace.id,
      };
    }

    // New member
    if (workspace.subscriptionTier === 'FREE') {
      const activeMembersCount = await this.prisma.workspaceMember.count({
        where: { workspaceId: workspace.id, isActive: true },
      });
      if (activeMembersCount >= 5) {
        throw new BadRequestException(
          'Workspace is full (Free tier limit reached)',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: 'MEMBER',
        },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });
      this.eventEmitter.emit('workspace.member_joined', {
        workspaceId: workspace.id,
        member: { id: user?.id, name: user?.name, avatarUrl: user?.avatarUrl },
      });

      return {
        message: 'Successfully joined workspace',
        workspaceId: workspace.id,
      };
    });
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

      // Find the inviter for event emitting
      const inviter = await tx.user.findUnique({
        where: { id: invite.invitedById },
      });

      this.eventEmitter.emit('invite.accepted', {
        workspaceId: invite.workspaceId,
        userId,
        inviterId: invite.invitedById,
        userEmail: user.email,
        userName: user.name,
        inviterEmail: inviter?.email,
      });

      return membership;
    });
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId, isActive: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    newRole: 'OWNER' | 'ADMIN' | 'MEMBER',
    requesterId: string,
  ) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member || !member.isActive) {
      throw new NotFoundException('Member not found or inactive');
    }

    return this.prisma.$transaction(async (tx) => {
      // If transferring ownership
      if (newRole === 'OWNER') {
        const currentOwner = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: requesterId } },
        });

        if (currentOwner?.role === 'OWNER') {
          // Demote current owner
          await tx.workspaceMember.update({
            where: { id: currentOwner.id },
            data: { role: 'ADMIN' },
          });
        }
      }

      const updated = await tx.workspaceMember.update({
        where: { id: member.id },
        data: { role: newRole },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: requesterId,
          action: 'member.role_updated',
          entityType: 'WorkspaceMember',
          entityId: member.id,
          metadataJson: JSON.parse(
            JSON.stringify({ newRole, targetUserId: userId }),
          ) as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async removeMember(workspaceId: string, userId: string, requesterId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member || !member.isActive) {
      throw new NotFoundException('Member not found or already removed');
    }

    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.workspaceMember.update({
        where: { id: member.id },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: requesterId,
          action: 'member.removed',
          entityType: 'WorkspaceMember',
          entityId: member.id,
          metadataJson: JSON.parse(
            JSON.stringify({ targetUserId: userId }),
          ) as Prisma.InputJsonValue,
        },
      });

      return removed;
    });
  }

  async getActivityLog(
    workspaceId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({
        where: { workspaceId },
      }),
    ]);

    // We need to fetch the users who performed the actions to get their names
    const userIds = Array.from(
      new Set(
        data.map((log) => log.userId).filter((id): id is string => Boolean(id)),
      ),
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedData = data.map((log) => {
      const actor = log.userId ? userMap.get(log.userId) : null;
      return {
        ...log,
        actorName: actor ? actor.name : 'System',
        actorEmail: actor ? actor.email : null,
      };
    });

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @OnEvent('invite.accepted')
  async handleInviteAccepted(payload: {
    workspaceId: string;
    userId: string;
    inviterId: string;
    userEmail: string;
    userName: string;
    inviterEmail?: string;
  }) {
    if (!payload.inviterId) return;

    const inviter = await this.prisma.user.findUnique({
      where: { id: payload.inviterId },
    });

    if (inviter) {
      await this.notificationsService.createNotification(
        inviter.id,
        'INVITE_ACCEPTED',
        'Invitation Accepted',
        `${payload.userName} has accepted your invitation to join the workspace.`,
        payload.workspaceId,
        { acceptedUserId: payload.userId },
      );

      if (inviter.globalEmailPref !== 'OFF') {
        await this.emailQueue.add('send-notification', {
          email: inviter.email,
          workspaceName: payload.workspaceId,
          title: 'Invitation Accepted',
          body: `${payload.userName} has joined your workspace!`,
        });
      }
    }
  }
}
