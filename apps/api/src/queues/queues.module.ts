import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { EmailProcessor } from './processors/email.processor';

const redisUrl = process.env.REDIS_TLS_URL || process.env.REDIS_URL;
let redisConnection: any = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls:
    process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost'
      ? { rejectUnauthorized: false }
      : undefined,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 100, 2000);
  },
};

if (redisUrl) {
  const url = new URL(redisUrl);
  redisConnection = {
    host: url.hostname,
    port: parseInt(url.port, 10),
    password: url.password ? decodeURIComponent(url.password) : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    tls: redisUrl.startsWith('rediss://')
      ? { rejectUnauthorized: false }
      : undefined,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
  };
}

console.log('[QueuesModule] Redis connection config:', {
  host: redisConnection.host,
  port: redisConnection.port,
  hasTLS: !!redisConnection.tls,
  hasPassword: !!redisConnection.password,
});

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnection,
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
  providers: [EmailProcessor],
})
export class QueuesModule {}
