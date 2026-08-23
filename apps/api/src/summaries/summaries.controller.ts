import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { SummariesService } from './summaries.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/summaries')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Get()
  async getSummaries(
    @Param('workspaceId') workspaceId: string,
    @Query('type') type?: 'DAILY' | 'WEEKLY',
  ) {
    return this.summariesService.getSummaries(workspaceId, type);
  }

  // TODO: Add RolesGuard to restrict this to Owner/Admin
  @Post('digests/trigger')
  async triggerWeeklyDigest(@Param('workspaceId') workspaceId: string) {
    const today = new Date();
    // In a real scenario, we would check Redis for rate limit (1x/hour)
    // For now, we dispatch directly to BullMQ.
    // Wait, since SummariesController doesn't have the queue injected,
    // it's cleaner to have a service method.
    return this.summariesService.dispatchWeeklyDigestJob(workspaceId, today);
  }
}
