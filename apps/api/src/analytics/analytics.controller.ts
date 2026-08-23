import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard, RolesGuard)
@Roles('OWNER', 'ADMIN') // Only Owner/Admin can see team analytics per tasks.md 10.1
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':workspaceId/submission-rate')
  async getSubmissionRate(
    @Param('workspaceId') workspaceId: string,
    @Query('days') days?: string,
  ) {
    const daysInt = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getSubmissionRate(workspaceId, daysInt);
  }

  @Get(':workspaceId/blocker-trend')
  async getBlockerTrend(
    @Param('workspaceId') workspaceId: string,
    @Query('days') days?: string,
  ) {
    const daysInt = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getBlockerTrend(workspaceId, daysInt);
  }

  @Get(':workspaceId/member-streaks')
  async getMemberStreaks(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getMemberStreaks(workspaceId);
  }

  @Get(':workspaceId/health')
  async getHealthScore(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getHealthScore(workspaceId);
  }
}
