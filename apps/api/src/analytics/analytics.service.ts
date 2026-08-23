import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubmissionRate(workspaceId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Group entries by date
    const entries = await this.prisma.standupEntry.groupBy({
      by: ['standupDate'],
      where: {
        workspaceId,
        standupDate: { gte: startDate },
        status: { in: ['SUBMITTED', 'LATE'] },
      },
      _count: { _all: true },
    });

    // Active members
    const membersCount = await this.prisma.workspaceMember.count({
      where: { workspaceId, isActive: true },
    });

    if (membersCount === 0) return [];

    return entries
      .map((e) => ({
        date: e.standupDate.toISOString().split('T')[0],
        rate: Math.round((e._count._all / membersCount) * 100),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getBlockerTrend(workspaceId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const blockers = await this.prisma.blockerFlag.findMany({
      where: {
        standupEntry: {
          workspaceId,
          standupDate: { gte: startDate },
        },
      },
      select: {
        severity: true,
        standupEntry: {
          select: { standupDate: true },
        },
      },
    });

    const trend = blockers.reduce(
      (acc, curr) => {
        const date = curr.standupEntry.standupDate.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        }
        acc[date][curr.severity] += 1;
        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.entries(trend)
      .map(([date, counts]) => ({
        date,
        ...counts,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getMemberStreaks(workspaceId: string) {
    // Current streak = consecutive SUBMITTED/LATE days going backwards from today
    // This is a simplified calculation returning dummy streak for now
    // since an exact SQL streak calculation requires window functions.

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, isActive: true },
      include: {
        user: {
          select: { name: true, avatarUrl: true },
        },
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Promise.all(
      members.map(async (member) => {
        const recentEntries = await this.prisma.standupEntry.findMany({
          where: {
            workspaceId,
            userId: member.userId,
            standupDate: { gte: thirtyDaysAgo },
          },
          orderBy: { standupDate: 'desc' },
          take: 10, // Check last 10 days for streak
        });

        let currentStreak = 0;
        let consecutiveMisses = 0;
        let missedCount = 0;

        for (const entry of recentEntries) {
          if (entry.status === 'MISSED') {
            if (currentStreak === 0) consecutiveMisses++;
            missedCount++;
          } else if (entry.status === 'SUBMITTED' || entry.status === 'LATE') {
            if (consecutiveMisses === 0) currentStreak++;
          }
        }

        return {
          userId: member.userId,
          name: member.user.name,
          avatarUrl: member.user.avatarUrl,
          currentStreak,
          needsAttention: consecutiveMisses >= 3,
          totalMissed30d: missedCount,
        };
      }),
    );

    return stats.sort((a, b) => b.currentStreak - a.currentStreak);
  }

  async getHealthScore(workspaceId: string) {
    const membersCount = await this.prisma.workspaceMember.count({
      where: { workspaceId, isActive: true },
    });

    if (membersCount === 0)
      return { score: 100, submissionRate: 100, resolutionRate: 100 };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Submission rate over 30 days
    const totalPossible = membersCount * 22; // approx working days in 30 days
    const submittedCount = await this.prisma.standupEntry.count({
      where: {
        workspaceId,
        standupDate: { gte: thirtyDaysAgo },
        status: { in: ['SUBMITTED', 'LATE'] },
      },
    });

    const submissionRate =
      totalPossible > 0
        ? Math.min(100, Math.round((submittedCount / totalPossible) * 100))
        : 100;

    // 2. Blocker resolution rate
    const blockers = await this.prisma.blockerFlag.findMany({
      where: {
        standupEntry: {
          workspaceId,
          standupDate: { gte: thirtyDaysAgo },
        },
      },
    });

    const totalBlockers = blockers.length;
    const resolvedBlockers = blockers.filter((b) => b.isResolved).length;

    const resolutionRate =
      totalBlockers > 0
        ? Math.round((resolvedBlockers / totalBlockers) * 100)
        : 100;

    // Weighted score: 60% submission, 40% resolution
    const score = Math.round(submissionRate * 0.6 + resolutionRate * 0.4);

    return {
      score,
      submissionRate,
      resolutionRate,
      totalBlockers,
      resolvedBlockers,
    };
  }
}
