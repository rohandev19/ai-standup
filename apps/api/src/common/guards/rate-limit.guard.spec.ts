import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from '../redis/redis.service';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    redisService = {
      incr: jest.fn(),
      expire: jest.fn(),
    } as any;
    guard = new RateLimitGuard(redisService);
  });

  const createMockContext = (ip: string, path: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          route: { path },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should use req.ip and allow request if count is within limit', async () => {
    redisService.incr.mockResolvedValue(1);
    redisService.expire.mockResolvedValue(1);

    const context = createMockContext('192.0.2.1', '/auth/login');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(redisService.incr).toHaveBeenCalledWith(
      'ratelimit:/auth/login:192.0.2.1',
    );
    expect(redisService.expire).toHaveBeenCalledWith(
      'ratelimit:/auth/login:192.0.2.1',
      60,
    );
  });

  it('should throw 429 Too Many Requests if count exceeds limit', async () => {
    redisService.incr.mockResolvedValue(6);

    const context = createMockContext('192.0.2.1', '/auth/login');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new HttpException(
        'Too many requests, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('should fail-open and allow request if Redis throws a network error', async () => {
    redisService.incr.mockRejectedValue(new Error('ECONNREFUSED'));

    const context = createMockContext('192.0.2.1', '/auth/login');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
