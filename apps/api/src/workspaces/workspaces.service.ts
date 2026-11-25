import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma, type SubscriptionTier } from '@prisma/client';
import * as crypto from 'crypto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AiService } from '../ai/ai.service';
import { subDays } from 'date-fns';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiService: AiService,
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
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        standupWindowStart: true,
        standupWindowEnd: true,
        workingDays: true,
        onboardingCompleted: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
        members: {
          where: { userId, isActive: true },
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

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    const member = existingUser
      ? await this.prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId: existingUser.id },
          },
        })
      : null;
    if (member?.isActive) {
      throw new BadRequestException('User is already a member');
    }

    const existingInvite = await this.prisma.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
        ...(member?.leftAt && { createdAt: { gt: member.leftAt } }),
      },
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

    const removedMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        isActive: false,
        user: { email: invite.email },
        leftAt: { gte: invite.createdAt },
      },
    });
    if (removedMember) {
      throw new BadRequestException('Create a new invitation for this member');
    }

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

  private async withMembershipTransaction<T>(
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(run, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        if (
          attempt >= 3 ||
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034'
        ) {
          throw error;
        }
      }
    }
  }

  private async checkWorkspaceCapacity(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    tier: SubscriptionTier,
  ) {
    if (tier !== 'FREE') return;
    const activeMembers = await tx.workspaceMember.count({
      where: { workspaceId, isActive: true },
    });
    if (activeMembers >= 5) {
      throw new BadRequestException(
        'Workspace is full (Free tier limit reached)',
      );
    }
  }

  async joinWithCode(userId: string, joinCode: string, joinPassword: string) {
    const { workspaceId, member } = await this.withMembershipTransaction(
      async (tx) => {
        const workspace = await tx.workspace.findUnique({
          where: { joinCode },
        });
        if (!workspace) throw new NotFoundException('Invalid Room Code');
        if (workspace.joinPassword !== joinPassword) {
          throw new BadRequestException('Invalid Password');
        }

        const workspaceId = workspace.id;
        const membership = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (membership?.isActive) return { workspaceId, member: null };
        if (membership) {
          throw new ForbiddenException(
            'Ask a workspace admin for a new invitation to rejoin',
          );
        }

        await this.checkWorkspaceCapacity(
          tx,
          workspaceId,
          workspace.subscriptionTier,
        );
        await tx.workspaceMember.create({
          data: { workspaceId, userId, role: 'MEMBER' },
        });
        const member = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, avatarUrl: true },
        });
        return { workspaceId, member };
      },
    );

    if (member) {
      this.eventEmitter.emit('workspace.member_joined', {
        workspaceId,
        member,
      });
    }
    return { message: 'Successfully joined workspace', workspaceId };
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
    const { membership, accepted } = await this.withMembershipTransaction(
      async (tx) => {
        const invite = await tx.workspaceInvite.findUnique({
          where: { token },
        });
        if (!invite) throw new NotFoundException('Invalid invitation token');
        if (invite.usedAt)
          throw new BadRequestException('Invitation already used');
        const now = new Date();
        if (invite.expiresAt <= now) {
          throw new BadRequestException('Invitation expired');
        }

        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.email !== invite.email) {
          throw new BadRequestException('Email does not match invitation');
        }

        const workspaceId = invite.workspaceId;
        const workspace = await tx.workspace.findUnique({
          where: { id: workspaceId },
          select: { subscriptionTier: true },
        });
        if (!workspace) throw new NotFoundException('Workspace not found');

        const existing = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (existing?.isActive) {
          throw new BadRequestException('User is already a member');
        }
        if (existing?.leftAt && invite.createdAt <= existing.leftAt) {
          throw new BadRequestException(
            'A new invitation is required to rejoin',
          );
        }

        await this.checkWorkspaceCapacity(
          tx,
          workspaceId,
          workspace.subscriptionTier,
        );
        await tx.workspaceInvite.update({
          where: { id: invite.id },
          data: { usedAt: now },
        });

        const membership = existing
          ? await tx.workspaceMember.update({
              where: { id: existing.id },
              data: {
                isActive: true,
                role: 'MEMBER',
                teamId: null,
                leftAt: null,
                joinedAt: now,
              },
            })
          : await tx.workspaceMember.create({
              data: { workspaceId, userId, role: 'MEMBER' },
            });

        const inviter = await tx.user.findUnique({
          where: { id: invite.invitedById },
        });
        return {
          membership,
          accepted: {
            workspaceId,
            userId,
            inviterId: invite.invitedById,
            userEmail: user.email,
            userName: user.name,
            inviterEmail: inviter?.email,
          },
        };
      },
    );

    this.eventEmitter.emit('invite.accepted', accepted);
    return membership;
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

    const requesterMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requesterId } },
    });

    if (!requesterMember || !requesterMember.isActive) {
      throw new ForbiddenException(
        'Requester is not an active member of this workspace',
      );
    }

    if (newRole === 'OWNER' || member.role === 'OWNER') {
      if (requesterMember.role !== 'OWNER') {
        throw new ForbiddenException(
          'Only the workspace owner can transfer or modify owner privileges',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (newRole === 'OWNER') {
        await tx.workspaceMember.update({
          where: { id: requesterMember.id },
          data: { role: 'ADMIN' },
        });
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

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    const requesterMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requesterId } },
    });

    if (
      !requesterMember?.isActive ||
      (requesterMember.role !== 'OWNER' && requesterMember.role !== 'ADMIN')
    ) {
      throw new ForbiddenException('Insufficient permissions to remove member');
    }

    const removed = await this.prisma.$transaction(async (tx) => {
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

    this.eventEmitter.emit('member.removed', { workspaceId, userId });
    return removed;
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

  async askAi(
    workspaceId: string,
    question: string,
    days: number,
  ): Promise<{ answer: string }> {
    // 1. Fetch standups for the last `days`
    const startDate = subDays(new Date(), days);

    const standups = await this.prisma.standupEntry.findMany({
      where: {
        workspaceId,
        standupDate: { gte: startDate },
        status: { in: ['SUBMITTED', 'LATE'] },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { standupDate: 'asc' },
    });

    if (standups.length === 0) {
      return {
        answer:
          'Maaf, tidak ada riwayat standup dalam periode waktu tersebut untuk dianalisis.',
      };
    }

    // 2. Format standups into context string
    const contextData = standups
      .map((s) => {
        const dateStr = s.standupDate.toISOString().split('T')[0];
        return `[${dateStr}] ${s.user.name}:\n- Kemarin: ${s.yesterdayText || '-'}\n- Hari ini: ${s.todayText || '-'}\n- Blocker: ${s.blockerText || '-'}`;
      })
      .join('\n\n');

    // 3. Call AI Service
    const answer = await this.aiService.askTeamQuestion(question, contextData);

    return { answer };
  }
}
