import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
    BullModule.registerQueue({
      name: 'ai-summary',
    }),
    BullModule.registerQueue({
      name: 'ai-blocker',
    }),
    BullModule.registerQueue({
      name: 'ai-weekly-digest',
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
      middleware: [], // Will add simple admin auth middleware later
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'ai-summary',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'ai-blocker',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'ai-weekly-digest',
      adapter: BullMQAdapter,
    }),
  ],
})
export class QueuesModule {}
