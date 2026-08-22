import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    BullModule.registerQueue({ name: 'ai-summary' }),
    BullModule.registerQueue({ name: 'ai-weekly-digest' }),
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
