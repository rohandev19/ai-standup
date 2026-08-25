import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StandupsService } from './standups.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { SubmitStandupDto } from './dto/submit-standup.dto';
import { EditStandupDto } from './dto/edit-standup.dto';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/standups')
export class StandupsController {
  constructor(private readonly standupsService: StandupsService) {}

  @Post()
  async submitStandup(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() dto: SubmitStandupDto,
  ) {
    return this.standupsService.submitStandup(
      workspaceId,
      req.user.id,
      dto.yesterdayText,
      dto.todayText,
      dto.blockerText,
    );
  }

  @Patch(':entryId')
  async editStandup(
    @Param('workspaceId') workspaceId: string,
    @Param('entryId') entryId: string,
    @Req() req: RequestWithUser,
    @Body() dto: EditStandupDto,
  ) {
    return this.standupsService.editStandup(
      workspaceId,
      req.user.id,
      entryId,
      dto,
    );
  }

  @Get('dashboard-state')
  async getDashboardState(@Param('workspaceId') workspaceId: string) {
    return this.standupsService.getDashboardState(workspaceId);
  }

  @Get('me')
  async getMyStandups(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.standupsService.getUserStandups(workspaceId, req.user.id);
  }

  @Get()
  async getStandups(
    @Param('workspaceId') workspaceId: string,
    @Query('date') date: string, // YYYY-MM-DD
  ) {
    return this.standupsService.getWorkspaceStandups(workspaceId, date);
  }

  // TODO: Add RolesGuard to restrict this to Owner/Admin
  @Patch('blockers/:blockerId/resolve')
  async resolveBlocker(
    @Param('workspaceId') workspaceId: string,
    @Param('blockerId') blockerId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.standupsService.resolveBlocker(
      workspaceId,
      blockerId,
      req.user.id,
    );
  }
}
