import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SummariesService } from './summaries.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/summaries')
export class SummariesController {
  private rateLimitMap = new Map<string, number>();

  constructor(private readonly summariesService: SummariesService) {}

  private enforceRateLimit(workspaceId: string, type: string, limitMs: number) {
    const key = `${workspaceId}_${type}`;
    const now = Date.now();
    const lastTrigger = this.rateLimitMap.get(key);
    if (lastTrigger && now - lastTrigger < limitMs) {
      throw new HttpException(
        `Rate limit exceeded. Try again later.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.rateLimitMap.set(key, now);
  }

  @Get()
  async getSummaries(
    @Param('workspaceId') workspaceId: string,
    @Query('type') type?: 'DAILY' | 'WEEKLY',
  ) {
    return this.summariesService.getSummaries(workspaceId, type);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('trigger-daily')
  async triggerDailySummary(@Param('workspaceId') workspaceId: string) {
    this.enforceRateLimit(workspaceId, 'daily', 60 * 1000); // 1 minute
    const today = new Date();
    return this.summariesService.dispatchDailySummaryJob(workspaceId, today);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('digests/trigger')
  async triggerWeeklyDigest(@Param('workspaceId') workspaceId: string) {
    this.enforceRateLimit(workspaceId, 'weekly', 60 * 60 * 1000); // 1 hour
    const today = new Date();
    return this.summariesService.dispatchWeeklyDigestJob(workspaceId, today);
  }
}
