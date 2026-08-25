import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Patch,
  Delete,
} from '@nestjs/common';
import type { Response } from 'express';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { InviteBulkDto } from './dto/invite-bulk.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  private exportRateLimit = new Map<string, number>();

  constructor(private readonly workspacesService: WorkspacesService) {}

  private enforceExportRateLimit(workspaceId: string, type: string) {
    const key = `${workspaceId}_${type}`;
    const now = Date.now();
    const lastExport = this.exportRateLimit.get(key);

    if (lastExport && now - lastExport < 5 * 60 * 1000) {
      throw new HttpException(
        'Rate limit exceeded. Try again in 5 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.exportRateLimit.set(key, now);
  }

  @Get()
  async getMyWorkspaces(@Req() req: RequestWithUser) {
    return this.workspacesService.getMyWorkspaces(req.user.id);
  }

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

  @UseGuards(WorkspaceMembershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Post(':id/invite-bulk')
  async inviteBulk(
    @Param('id') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() dto: InviteBulkDto,
  ) {
    return this.workspacesService.bulkInviteMembers(
      workspaceId,
      req.user.id,
      dto.emails,
    );
  }

  @UseGuards(WorkspaceMembershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Patch(':id/onboarding')
  async updateOnboarding(
    @Param('id') workspaceId: string,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.workspacesService.updateOnboarding(workspaceId, dto);
  }

  @Post('join')
  async joinWorkspace(
    @Req() req: RequestWithUser,
    @Body() dto: JoinWorkspaceDto,
  ) {
    return this.workspacesService.joinWorkspace(dto.token, req.user.id);
  }

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Get(':workspaceId/history')
  async getHistory(
    @Param('workspaceId') workspaceId: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.workspacesService.getHistory(workspaceId, query);
  }

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Roles('OWNER')
  @Post(':workspaceId/export/entries')
  async exportEntries(
    @Param('workspaceId') workspaceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    this.enforceExportRateLimit(workspaceId, 'entries');
    const csv = await this.workspacesService.exportEntriesCsv(
      workspaceId,
      startDate,
      endDate,
    );
    res.header('Content-Type', 'text/csv');
    res.attachment(`standup-entries-${workspaceId}.csv`);
    return res.send(csv);
  }

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Roles('OWNER')
  @Post(':workspaceId/export/summaries')
  async exportSummaries(
    @Param('workspaceId') workspaceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    this.enforceExportRateLimit(workspaceId, 'summaries');
    const csv = await this.workspacesService.exportSummariesCsv(
      workspaceId,
      startDate,
      endDate,
    );
    res.header('Content-Type', 'text/csv');
    res.attachment(`ai-summaries-${workspaceId}.csv`);
    return res.send(csv);
  }

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Get(':id/members')
  async getMembers(@Param('id') workspaceId: string) {
    return this.workspacesService.getWorkspaceMembers(workspaceId);
  }

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Patch(':id/members/:userId/role')
  async updateMemberRole(
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
    @Body('role') role: 'OWNER' | 'ADMIN' | 'MEMBER',
    @Req() req: RequestWithUser,
  ) {
    return this.workspacesService.updateMemberRole(
      workspaceId,
      userId,
      role,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.workspacesService.removeMember(
      workspaceId,
      userId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Get(':id/activity')
  async getActivityLog(
    @Param('id') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageInt = page ? parseInt(page, 10) : 1;
    const limitInt = limit ? parseInt(limit, 10) : 20;
    return this.workspacesService.getActivityLog(workspaceId, pageInt, limitInt);
  }
}
