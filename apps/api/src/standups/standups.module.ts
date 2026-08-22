import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StandupsService } from './standups.service';
import { StandupsController } from './standups.controller';
import { AiBlockerProcessor } from '../queues/processors/ai-blocker.processor';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-blocker',
    }),
    AiModule,
  ],
  providers: [StandupsService, AiBlockerProcessor],
  controllers: [StandupsController],
})
export class StandupsModule {}
