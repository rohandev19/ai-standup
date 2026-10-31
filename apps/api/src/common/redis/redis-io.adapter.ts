import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { INestApplicationContext } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;
  private readonly shouldSkipRedis: boolean;

  constructor(app: INestApplicationContext) {
    super(app);

    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    this.shouldSkipRedis =
      process.env.NODE_ENV === 'production' &&
      !redisUrl &&
      (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'localhost');

    if (this.shouldSkipRedis) {
      return;
    }

    if (redisUrl) {
      this.pubClient = new Redis(redisUrl, {
        connectTimeout: 3000,
        tls:
          redisUrl.startsWith('rediss://') || redisUrl.includes('upstash')
            ? { rejectUnauthorized: false }
            : undefined,
      });
    } else {
      this.pubClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        connectTimeout: 3000,
        tls:
          process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost'
            ? { rejectUnauthorized: false }
            : undefined,
      });
    }

    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (err) => {
      console.warn('[RedisIoAdapter] pubClient warning:', err.message);
    });
    this.subClient.on('error', (err) => {
      console.warn('[RedisIoAdapter] subClient warning:', err.message);
    });
  }

  async connectToRedis(): Promise<void> {
    if (this.shouldSkipRedis || !this.pubClient || !this.subClient) {
      console.warn(
        '[RedisIoAdapter] No external Redis configured, using in-memory Socket.io adapter.',
      );
      return;
    }

    try {
      const connectWithTimeout = (client: Redis) =>
        new Promise<void>((resolve, reject) => {
          if (client.status === 'ready') return resolve();
          const timer = setTimeout(() => {
            reject(new Error('Redis connection timed out after 3000ms'));
          }, 3000);
          client.once('ready', () => {
            clearTimeout(timer);
            resolve();
          });
          client.once('error', (err) => {
            clearTimeout(timer);
            reject(err);
          });
        });

      await Promise.all([
        connectWithTimeout(this.pubClient),
        connectWithTimeout(this.subClient),
      ]);
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    } catch (err: unknown) {
      console.warn(
        '[RedisIoAdapter] Redis adapter unavailable, falling back to in-memory Socket.io adapter:',
        (err as Error).message,
      );
      this.pubClient.disconnect();
      this.subClient.disconnect();
      return;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
