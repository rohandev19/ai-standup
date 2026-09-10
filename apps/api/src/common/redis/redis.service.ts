import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const redisUrl = process.env.REDIS_TLS_URL || process.env.REDIS_URL;

    if (redisUrl) {
      super(redisUrl, {
        tls: redisUrl.startsWith('rediss://')
          ? { rejectUnauthorized: false }
          : undefined,
      });
    } else {
      super({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        tls:
          process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost'
            ? {}
            : undefined,
      });
    }
  }

  onModuleInit() {
    // Already connected via constructor
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
