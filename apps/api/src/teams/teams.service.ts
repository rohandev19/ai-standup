import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(workspaceId: string, name: string) {
    return this.prisma.team.create({
      data: {
        workspaceId,
        name,
      },
    });
  }

  async getTeamsByWorkspace(workspaceId: string) {
    return this.prisma.team.findMany({
      where: { workspaceId },
    });
  }

  async assignMemberToTeam(
    workspaceId: string,
    userId: string,
    teamId: string,
  ) {
    // Validate team exists in workspace
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, workspaceId },
    });

    if (!team) {
      throw new NotFoundException('Team not found in this workspace');
    }

    return this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      data: {
        teamId,
      },
    });
  }
}
