import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTeamDto } from './dto/create-team.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getTeams(@Param('workspaceId') workspaceId: string) {
    return this.teamsService.getTeamsByWorkspace(workspaceId);
  }

  @Roles('OWNER', 'ADMIN')
  @Post()
  async createTeam(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(workspaceId, dto.name);
  }

  @Roles('OWNER', 'ADMIN')
  @Post(':teamId/members/:userId')
  async assignMember(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.assignMemberToTeam(workspaceId, userId, teamId);
  }
}
