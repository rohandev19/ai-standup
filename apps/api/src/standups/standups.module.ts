import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StandupsService } from './standups.service';
import { StandupsController } from './standups.controller';
import { AiBlockerProcessor } from '../queues/processors/ai-blocker.processor';
import { AiModule } from '../ai/ai.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-blocker',
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
    AiModule,
    EventsModule,
    NotificationsModule,
  ],
  providers: [StandupsService, AiBlockerProcessor],
  controllers: [StandupsController],
})
export class StandupsModule {}
