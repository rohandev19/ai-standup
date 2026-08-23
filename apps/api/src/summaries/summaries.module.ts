import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SummariesService } from './summaries.service';
import { SummariesController } from './summaries.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiSummaryProcessor } from '../queues/processors/ai-summary.processor';
import { AiWeeklyDigestProcessor } from '../queues/processors/ai-weekly.processor';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    EventsModule,
    BullModule.registerQueue({ name: 'ai-weekly-digest' }),
    BullModule.registerQueue({ name: 'email' }),
    NotificationsModule,
  ],
  providers: [SummariesService, AiSummaryProcessor, AiWeeklyDigestProcessor],
  controllers: [SummariesController],
  exports: [SummariesService],
})
export class SummariesModule {}
