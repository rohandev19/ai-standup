import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
}
