import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Support Heroku/Load balancers by reading x-forwarded-for
    const xForwardedFor = req.headers['x-forwarded-for'];
    const ip = xForwardedFor
      ? xForwardedFor.split(',')[0].trim()
      : req.ip || req.connection?.remoteAddress;
    const path = req.route.path;

    // We can use a sliding window or simple token bucket. A simple fixed window is easiest.
    // Allow 5 requests per minute per IP for this route.
    const windowSeconds = 60;
    const maxRequests = 5;
    const key = `ratelimit:${path}:${ip}`;

    try {
      const currentCount = await this.redisService.incr(key);

      if (currentCount === 1) {
        await this.redisService.expire(key, windowSeconds);
      }

      if (currentCount > maxRequests) {
        throw new HttpException(
          'Too many requests, please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      // Fail-open: if Redis has a transient network error, allow request to avoid blocking legitimate users
      this.logger.warn(
        `[RateLimitGuard] Redis error for ${key}, failing open: ${(err as Error).message}`,
      );
      return true;
    }

    return true;
  }
}
