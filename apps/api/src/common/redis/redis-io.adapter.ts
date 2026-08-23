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
    this.pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      tls:
        process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost'
          ? {}
          : undefined,
    });

    this.subClient = this.pubClient.duplicate();
  }

  async connectToRedis(): Promise<void> {
    await Promise.all([
      new Promise<void>((resolve) => this.pubClient.on('ready', resolve)),
      new Promise<void>((resolve) => this.subClient.on('ready', resolve)),
    ]);
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
