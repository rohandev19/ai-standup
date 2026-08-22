import { Controller, Post, Body, Req, UseGuards, Param } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async createWorkspace(
    @Req() req: RequestWithUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.createWorkspace(dto.name, req.user.id);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Post(':id/invite')
  async inviteMember(
    @Param('id') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.inviteMember(
      workspaceId,
      dto.email,
      req.user.id,
    );
  }

  @Post('join')
  async joinWorkspace(
    @Req() req: RequestWithUser,
    @Body() dto: JoinWorkspaceDto,
  ) {
    return this.workspacesService.joinWorkspace(dto.token, req.user.id);
  }
}
