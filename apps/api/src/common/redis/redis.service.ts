import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

interface FallbackStoreItem {
  value: string;
  expiresAt?: number;
}

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private memoryStore = new Map<string, FallbackStoreItem>();
  private readonly fallbackFilePath = path.resolve(
    process.cwd(),
    '.redis-dev-store.json',
  );

  constructor() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const isProdWithoutRedis =
      process.env.NODE_ENV === 'production' &&
      !redisUrl &&
      (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'localhost');

    const baseOptions = {
      connectTimeout: 3000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      keepAlive: 30000,
      lazyConnect: isProdWithoutRedis,
      retryStrategy: (times: number) => {
        if (isProdWithoutRedis) {
          return null;
        }
        if (times > 5) {
          return 30000;
        }
        return Math.min(times * 500, 3000);
      },
    };

    if (redisUrl) {
      super(redisUrl, {
        ...baseOptions,
        tls:
          redisUrl.startsWith('rediss://') || redisUrl.includes('upstash')
            ? { rejectUnauthorized: false }
            : undefined,
      });
    } else {
      super({
        ...baseOptions,
        host: redisHost,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        tls:
          process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost'
            ? { rejectUnauthorized: false }
            : undefined,
      });
    }

    this.on('error', (err) => {
      // Suppress crash on temporary Redis disconnects or rate limit errors
      console.warn('[RedisService] Redis connection warning:', err.message);
    });

    this.loadFallbackStore();
  }

  private loadFallbackStore(): void {
    if (!this.isDev()) return;
    try {
      if (fs.existsSync(this.fallbackFilePath)) {
        const raw = fs.readFileSync(this.fallbackFilePath, 'utf-8');
        const data = JSON.parse(raw) as Record<string, FallbackStoreItem>;
        const now = Date.now();
        for (const [key, storeItem] of Object.entries(data)) {
          if (!storeItem.expiresAt || storeItem.expiresAt > now) {
            this.memoryStore.set(key, storeItem);
          }
        }
      }
    } catch {
      // Ignore reading error
    }
  }

  private saveFallbackStore(): void {
    if (!this.isDev()) return;
    try {
      const obj: Record<string, FallbackStoreItem> = {};
      const now = Date.now();
      for (const [key, item] of this.memoryStore.entries()) {
        if (!item.expiresAt || item.expiresAt > now) {
          obj[key] = item;
        } else {
          this.memoryStore.delete(key);
        }
      }
      fs.writeFileSync(
        this.fallbackFilePath,
        JSON.stringify(obj, null, 2),
        'utf-8',
      );
    } catch {
      // Ignore writing error
    }
  }

  private isDev(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private setMemoryItem(key: string, value: string, args: unknown[]): void {
    let ttlMs: number | undefined;
    if (args[0] === 'EX' && typeof args[1] === 'number') {
      ttlMs = args[1] * 1000;
    } else if (args[0] === 'PX' && typeof args[1] === 'number') {
      ttlMs = args[1];
    }
    this.memoryStore.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });
    this.saveFallbackStore();
  }

  private getMemoryItem(key: string): string | null {
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      this.saveFallbackStore();
      return null;
    }
    return item.value;
  }

  override async set(key: any, value: any, ...args: any[]): Promise<any> {
    const strKey = String(key);
    const strVal = String(value);
    this.setMemoryItem(strKey, strVal, args);

    if (this.status !== 'ready') {
      return 'OK';
    }

    try {
      return await super.set(key, value, ...args);
    } catch (err: unknown) {
      console.warn(
        `[RedisService] set(${strKey}) fallback to memoryStore:`,
        (err as Error)?.message,
      );
      return 'OK';
    }
  }

  override async get(key: any): Promise<any> {
    const strKey = String(key);

    if (this.status !== 'ready') {
      return this.getMemoryItem(strKey);
    }

    try {
      const val = await super.get(key);
      if (val !== null && val !== undefined) {
        return val;
      }
      return this.getMemoryItem(strKey);
    } catch (err: unknown) {
      console.warn(
        `[RedisService] get(${strKey}) fallback to memoryStore:`,
        (err as Error)?.message,
      );
      return this.getMemoryItem(strKey);
    }
  }

  override async del(...keys: any[]): Promise<any> {
    let memCount = 0;
    const flatKeys = keys.flat();
    for (const k of flatKeys) {
      if (this.memoryStore.delete(String(k))) {
        memCount++;
      }
    }
    if (memCount > 0) {
      this.saveFallbackStore();
    }

    if (this.status !== 'ready') {
      return memCount;
    }

    try {
      return await super.del(...keys);
    } catch (err: unknown) {
      console.warn(
        '[RedisService] del fallback to memoryStore:',
        (err as Error)?.message,
      );
      return memCount;
    }
  }

  override async incr(key: any): Promise<any> {
    const strKey = String(key);

    const incrMemory = (): number => {
      const existing = this.memoryStore.get(strKey);
      const isExpired = existing?.expiresAt && Date.now() > existing.expiresAt;
      const current =
        existing && !isExpired ? parseInt(existing.value, 10) || 0 : 0;
      const next = current + 1;
      this.memoryStore.set(strKey, {
        value: String(next),
        expiresAt: isExpired ? undefined : existing?.expiresAt,
      });
      this.saveFallbackStore();
      return next;
    };

    if (this.status !== 'ready') {
      return incrMemory();
    }

    try {
      return await super.incr(key);
    } catch (err: unknown) {
      console.warn(
        `[RedisService] incr(${strKey}) fallback to memoryStore:`,
        (err as Error)?.message,
      );
      return incrMemory();
    }
  }

  override async expire(key: any, seconds: number): Promise<any> {
    const strKey = String(key);
    const item = this.memoryStore.get(strKey);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      this.saveFallbackStore();
    }

    if (this.status !== 'ready') {
      return item ? 1 : 0;
    }

    try {
      return await super.expire(key, seconds);
    } catch (err: unknown) {
      console.warn(
        `[RedisService] expire(${strKey}) fallback to memoryStore:`,
        (err as Error)?.message,
      );
      return item ? 1 : 0;
    }
  }

  override async pexpire(key: any, milliseconds: number): Promise<any> {
    const strKey = String(key);
    const item = this.memoryStore.get(strKey);
    if (item) {
      item.expiresAt = Date.now() + milliseconds;
      this.saveFallbackStore();
    }

    if (this.status !== 'ready') {
      return item ? 1 : 0;
    }

    try {
      return await super.pexpire(key, milliseconds);
    } catch (err: unknown) {
      console.warn(
        `[RedisService] pexpire(${strKey}) fallback to memoryStore:`,
        (err as Error)?.message,
      );
      return item ? 1 : 0;
    }
  }

  onModuleInit(): void {
    // Connection managed by constructor / lazyConnect
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.status === 'ready' || this.status === 'connecting') {
        await this.quit();
      } else {
        this.disconnect();
      }
    } catch {
      this.disconnect();
    }
  }
}
