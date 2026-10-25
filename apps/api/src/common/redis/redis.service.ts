import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

interface FallbackStoreItem {
  value: any;
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

    this.on('error', (err) => {
      // Suppress crash on temporary Redis disconnects or rate limit errors
      console.warn('[RedisService] Redis connection warning:', err.message);
    });

    this.loadFallbackStore();
  }

  private loadFallbackStore() {
    if (!this.isDev()) return;
    try {
      if (fs.existsSync(this.fallbackFilePath)) {
        const raw = fs.readFileSync(this.fallbackFilePath, 'utf-8');
        const data = JSON.parse(raw);
        const now = Date.now();
        for (const [key, item] of Object.entries(data)) {
          const storeItem = item as FallbackStoreItem;
          if (!storeItem.expiresAt || storeItem.expiresAt > now) {
            this.memoryStore.set(key, storeItem);
          }
        }
      }
    } catch {
      // Ignore reading error
    }
  }

  private saveFallbackStore() {
    if (!this.isDev()) return;
    try {
      const obj: Record<string, FallbackStoreItem> = {};
      const now = Date.now();
      for (const [key, item] of this.memoryStore.entries()) {
        if (!item.expiresAt || item.expiresAt > now) {
          obj[key] = item;
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

  override async set(key: any, value: any, ...args: any[]): Promise<any> {
    try {
      return await super.set(key, value, ...args);
    } catch (err: any) {
      if (
        this.isDev() &&
        (err?.message?.includes('max requests limit exceeded') ||
          err?.code === 'ECONNRESET')
      ) {
        let ttlSeconds: number | undefined;
        if (args[0] === 'EX' && typeof args[1] === 'number') {
          ttlSeconds = args[1];
        } else if (args[0] === 'PX' && typeof args[1] === 'number') {
          ttlSeconds = args[1] / 1000;
        }
        this.memoryStore.set(String(key), {
          value: String(value),
          expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
        });
        this.saveFallbackStore();
        return 'OK';
      }
      throw err;
    }
  }

  override async get(key: any): Promise<any> {
    try {
      return await super.get(key);
    } catch (err: any) {
      if (
        this.isDev() &&
        (err?.message?.includes('max requests limit exceeded') ||
          err?.code === 'ECONNRESET')
      ) {
        const item = this.memoryStore.get(String(key));
        if (!item) return null;
        if (item.expiresAt && Date.now() > item.expiresAt) {
          this.memoryStore.delete(String(key));
          this.saveFallbackStore();
          return null;
        }
        return item.value;
      }
      throw err;
    }
  }

  override async del(...keys: any[]): Promise<any> {
    try {
      return await super.del(...keys);
    } catch (err: any) {
      if (
        this.isDev() &&
        (err?.message?.includes('max requests limit exceeded') ||
          err?.code === 'ECONNRESET')
      ) {
        let count = 0;
        for (const k of keys) {
          if (this.memoryStore.delete(String(k))) count++;
        }
        if (count > 0) {
          this.saveFallbackStore();
        }
        return count;
      }
      throw err;
    }
  }

  override async incr(key: any): Promise<any> {
    try {
      return await super.incr(key);
    } catch (err: any) {
      if (
        this.isDev() &&
        (err?.message?.includes('max requests limit exceeded') ||
          err?.code === 'ECONNRESET')
      ) {
        const item = this.memoryStore.get(String(key));
        const current = item ? parseInt(item.value, 10) || 0 : 0;
        const next = current + 1;
        this.memoryStore.set(String(key), {
          value: String(next),
          expiresAt: item?.expiresAt,
        });
        this.saveFallbackStore();
        return next;
      }
      throw err;
    }
  }

  override async expire(key: any, seconds: number): Promise<any> {
    try {
      return await super.expire(key, seconds);
    } catch (err: any) {
      if (
        this.isDev() &&
        (err?.message?.includes('max requests limit exceeded') ||
          err?.code === 'ECONNRESET')
      ) {
        const item = this.memoryStore.get(String(key));
        if (item) {
          item.expiresAt = Date.now() + seconds * 1000;
          this.saveFallbackStore();
          return 1;
        }
        return 0;
      }
      throw err;
    }
  }

  onModuleInit() {
    // Already connected via constructor
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
