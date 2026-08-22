import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.connection.remoteAddress;
    const path = req.route.path;

    // We can use a sliding window or simple token bucket. A simple fixed window is easiest.
    // Allow 5 requests per minute per IP for this route.
    const windowSeconds = 60;
    const maxRequests = 5;
    const key = `ratelimit:${path}:${ip}`;

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

    return true;
  }
}
