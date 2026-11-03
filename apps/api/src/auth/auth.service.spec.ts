import * as crypto from 'crypto';
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
  it('hashes verification tokens with SHA-256 and verifies successfully with raw token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({
      id: 'user-2',
      email: 'verify@example.com',
      name: 'Verify User',
      isEmailVerified: false,
    });

    // Provide mock SMTP so verification token is stored
    const prevHost = process.env.SMTP_HOST;
    const prevUser = process.env.SMTP_USER;
    const prevPass = process.env.SMTP_PASS;
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';

    try {
      await service.register({
        email: 'verify@example.com',
        password: 'Password123',
        name: 'Verify User',
        consentGivenAt: new Date().toISOString(),
      });

      // Find the verify-email key in redisStore
      const verifyKey = Array.from(redisStore.keys()).find((k) =>
        k.startsWith('verify-email:'),
      );
      expect(verifyKey).toBeDefined();

      const tokenHash = verifyKey!.split(':')[1];
      // SHA-256 is 64 hex characters
      expect(tokenHash).toHaveLength(64);
      expect(redisStore.get(verifyKey!)).toBe('user-2');

      // Now verify using verifyEmail - we extract the raw token passed to sendEmailSafe (or generate and verify)
      // Since sendEmailSafe received the rawToken in jobData or text, let's test verifyEmail directly:
      const rawToken = 'my-raw-verification-token';
      const expectedHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      redisStore.set(`verify-email:${expectedHash}`, 'user-2');

      const verifyRes = await service.verifyEmail(rawToken);
      expect(verifyRes.message).toContain('successfully verified');
      expect(usersService.update).toHaveBeenCalledWith('user-2', {
        isEmailVerified: true,
      });
      expect(redisStore.has(`verify-email:${expectedHash}`)).toBe(false);
    } finally {
      process.env.SMTP_HOST = prevHost;
      process.env.SMTP_USER = prevUser;
      process.env.SMTP_PASS = prevPass;
    }
  });

  it('hashes password reset tokens with SHA-256 and verifies successfully with raw token', async () => {
    const mockUser = {
      id: 'user-reset-1',
      email: 'reset@example.com',
      name: 'Reset User',
      passwordHash: 'old-hash',
    };
    usersService.findByEmail.mockResolvedValue(mockUser);

    const prevHost = process.env.SMTP_HOST;
    const prevUser = process.env.SMTP_USER;
    const prevPass = process.env.SMTP_PASS;
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';

    try {
      await service.requestPasswordReset('reset@example.com');

      const resetKey = Array.from(redisStore.keys()).find((k) =>
        k.startsWith('reset-password:'),
      );
      expect(resetKey).toBeDefined();
      const tokenHash = resetKey!.split(':')[1];
      expect(tokenHash).toHaveLength(64);
      expect(redisStore.get(resetKey!)).toBe('user-reset-1');

      // Test resetPassword with a known raw token
      const rawResetToken = 'my-raw-reset-token-12345';
      const rawHash = crypto
        .createHash('sha256')
        .update(rawResetToken)
        .digest('hex');
      redisStore.set(`reset-password:${rawHash}`, 'user-reset-1');

      const resetRes = await service.resetPassword(
        rawResetToken,
        'NewSecretPassword123',
      );
      expect(resetRes.message).toContain('successfully reset');
      expect(usersService.update).toHaveBeenCalledWith(
        'user-reset-1',
        expect.objectContaining({ passwordHash: 'hashed-password' }),
      );
      expect(redisStore.has(`reset-password:${rawHash}`)).toBe(false);
    } finally {
      process.env.SMTP_HOST = prevHost;
      process.env.SMTP_USER = prevUser;
      process.env.SMTP_PASS = prevPass;
    }
  });

  it('maintains backward compatibility with pre-existing unhashed tokens', async () => {
    // Setup legacy unhashed token directly in redis
    redisStore.set('reset-password:legacy-raw-token', 'user-legacy');

    const resetRes = await service.resetPassword(
      'legacy-raw-token',
      'NewPassword123',
    );
    expect(resetRes.message).toContain('successfully reset');
    expect(usersService.update).toHaveBeenCalledWith(
      'user-legacy',
      expect.objectContaining({ passwordHash: 'hashed-password' }),
    );
    expect(redisStore.has('reset-password:legacy-raw-token')).toBe(false);
  });
});
