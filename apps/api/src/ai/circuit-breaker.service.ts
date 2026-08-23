import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreakerOpenException extends Error {
  constructor() {
    super('Circuit Breaker is OPEN. Downstream API is unreachable.');
    this.name = 'CircuitBreakerOpenException';
  }
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  private readonly FAILURE_THRESHOLD = 5;
  private readonly WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  private readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly redis: RedisService) {}

  private getKeyPrefix(serviceName: string) {
    return `circuit_breaker:${serviceName}`;
  }

  async getState(serviceName: string): Promise<CircuitBreakerState> {
    const client = this.redis;
    const prefix = this.getKeyPrefix(serviceName);
    const state = await client.get(`${prefix}:state`);

    if (state === 'OPEN') {
      const openTimeStr = await client.get(`${prefix}:open_time`);
      if (openTimeStr) {
        const openTime = parseInt(openTimeStr, 10);
        if (Date.now() - openTime > this.COOLDOWN_MS) {
          // Cooldown has passed, transition to HALF_OPEN
          await this.transitionToHalfOpen(serviceName);
          return CircuitBreakerState.HALF_OPEN;
        }
      }
      return CircuitBreakerState.OPEN;
    }

    if (state === 'HALF_OPEN') {
      return CircuitBreakerState.HALF_OPEN;
    }

    return CircuitBreakerState.CLOSED;
  }

  async recordSuccess(serviceName: string): Promise<void> {
    const client = this.redis;
    const prefix = this.getKeyPrefix(serviceName);

    // If we succeed while HALF_OPEN or CLOSED, reset everything
    await client.del(
      `${prefix}:state`,
      `${prefix}:failures`,
      `${prefix}:open_time`,
    );
    this.logger.log(`Circuit Breaker for ${serviceName} reset to CLOSED.`);
  }

  async recordFailure(serviceName: string): Promise<void> {
    const client = this.redis;
    const prefix = this.getKeyPrefix(serviceName);
    const state = await this.getState(serviceName);

    if (state === CircuitBreakerState.HALF_OPEN) {
      // If we fail while HALF_OPEN, immediately transition back to OPEN
      await this.transitionToOpen(serviceName);
      return;
    }

    if (state === CircuitBreakerState.CLOSED) {
      const failures = await client.incr(`${prefix}:failures`);
      if (failures === 1) {
        await client.pexpire(`${prefix}:failures`, this.WINDOW_MS);
      }

      if (failures >= this.FAILURE_THRESHOLD) {
        await this.transitionToOpen(serviceName);
      }
    }
  }

  async execute<T>(serviceName: string, action: () => Promise<T>): Promise<T> {
    const state = await this.getState(serviceName);

    if (state === CircuitBreakerState.OPEN) {
      throw new CircuitBreakerOpenException();
    }

    try {
      const result = await action();
      await this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      await this.recordFailure(serviceName);
      throw error;
    }
  }

  private async transitionToOpen(serviceName: string) {
    const client = this.redis;
    const prefix = this.getKeyPrefix(serviceName);
    await client.set(`${prefix}:state`, 'OPEN');
    await client.set(`${prefix}:open_time`, Date.now().toString());
    this.logger.warn(
      `Circuit Breaker for ${serviceName} transitioned to OPEN.`,
    );
  }

  private async transitionToHalfOpen(serviceName: string) {
    const client = this.redis;
    const prefix = this.getKeyPrefix(serviceName);
    await client.set(`${prefix}:state`, 'HALF_OPEN');
    this.logger.log(
      `Circuit Breaker for ${serviceName} transitioned to HALF_OPEN.`,
    );
  }
}
