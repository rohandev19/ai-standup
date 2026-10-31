import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    findByGoogleId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    incrementFailedLogin: jest.Mock;
    resetFailedLogin: jest.Mock;
    lockAccount: jest.Mock;
  };
  let redisStore: Map<string, string>;
  let redisService: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    redisStore = new Map<string, string>();
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      incrementFailedLogin: jest.fn(),
      resetFailedLogin: jest.fn(),
      lockAccount: jest.fn(),
    };
    redisService = {
      set: jest.fn(async (key: string, val: string) => {
        redisStore.set(key, val);
        return 'OK';
      }),
      get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
        return 1;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: RedisService, useValue: redisService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-jwt-token') },
        },
        {
          provide: getQueueToken('email'),
          useValue: { add: jest.fn().mockResolvedValue({ id: 'job-1' }) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a new user without blocking when production SMTP is not configured', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSmtpHost = process.env.SMTP_HOST;
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;

    try {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
        isEmailVerified: true,
      });

      const res = await service.register({
        email: 'new@example.com',
        password: 'Password123',
        name: 'New User',
        consentGivenAt: new Date().toISOString(),
      });

      expect(res.message).toContain('If the email is valid');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          isEmailVerified: true,
        }),
      );
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      process.env.SMTP_HOST = prevSmtpHost;
    }
  });

  it('allows login and stores refresh token in RedisService', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password',
      isLocked: false,
      isEmailVerified: true,
      failedLoginAttempts: 0,
    };
    usersService.findByEmail.mockResolvedValue(mockUser);
    usersService.findById.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const res = await service.login({
      email: 'test@example.com',
      password: 'Password123',
    });

    expect(res.accessToken).toBe('signed-jwt-token');
    expect(res.refreshToken).toBeDefined();
    expect(redisService.set).toHaveBeenCalled();

    const refreshed = await service.refresh(res.refreshToken);
    expect(refreshed.accessToken).toBe('signed-jwt-token');
  });
});
