import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { INestApplicationContext } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(app: INestApplicationContext) {
    super(app);

    // We create separate connections for pub/sub because a Redis client in subscriber mode
    // cannot be used to publish messages.
    const redisUrl = process.env.REDIS_TLS_URL || process.env.REDIS_URL;

    if (redisUrl) {
      // Heroku provides a full URL for Redis
      this.pubClient = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://')
          ? { rejectUnauthorized: false }
          : undefined,
      });
    } else {
      // Fallback for local development
      this.pubClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        tls:
          process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost'
            ? {}
            : undefined,
      });
    }

    this.subClient = this.pubClient.duplicate();
  }

  async connectToRedis(): Promise<void> {
    try {
      const connectWithTimeout = (client: Redis) =>
        new Promise<void>((resolve, reject) => {
          if (client.status === 'ready') return resolve();
          const timer = setTimeout(() => {
            reject(new Error('Redis connection timed out after 5000ms'));
          }, 5000);
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
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[RedisIoAdapter] Redis adapter unavailable in development, falling back to in-memory Socket.io adapter:',
          err.message,
        );
        return;
      }
      throw err;
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
