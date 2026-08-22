import { Module } from '@nestjs/common';
import { SummariesService } from './summaries.service';
import { SummariesController } from './summaries.controller';
import { AiModule } from '../ai/ai.module';
import { AiSummaryProcessor } from '../queues/processors/ai-summary.processor';
import { AiWeeklyDigestProcessor } from '../queues/processors/ai-weekly.processor';

@Module({
  imports: [AiModule],
  providers: [SummariesService, AiSummaryProcessor, AiWeeklyDigestProcessor],
  controllers: [SummariesController],
  exports: [SummariesService],
})
export class SummariesModule {}
