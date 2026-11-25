import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  const originalEnv = process.env;
  const emailQueue = { add: jest.fn() };
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    findByGoogleId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    incrementFailedLogin: jest.Mock;
    resetFailedLogin: jest.Mock;
    replacePassword: jest.Mock;
    lockAccount: jest.Mock;
  };
  let redisStore: Map<string, string>;
  let redisService: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      SMTP_HOST: 'smtp.example.invalid',
      SMTP_USER: 'mail-user',
      SMTP_PASS: 'mail-test-password',
      USE_DIRECT_EMAIL: 'false',
    };
    emailQueue.add.mockReset().mockResolvedValue({ id: 'job-1' });
    redisStore = new Map<string, string>();
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      incrementFailedLogin: jest.fn(),
      resetFailedLogin: jest.fn(),
      replacePassword: jest.fn().mockResolvedValue(true),
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
          useValue: emailQueue,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('keeps registration, repeat registration, resend, and login unverified without production SMTP', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    const user = {
      id: 'user-1',
      email: 'new@example.invalid',
      name: 'New User',
      passwordHash: 'hashed-password',
      isEmailVerified: false,
    };
    const registerDto = {
      email: user.email,
      password: 'Password123',
      name: user.name,
      consentGivenAt: new Date().toISOString(),
    };

    usersService.findByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValue(user);
    usersService.create.mockResolvedValue(user);

    const first = await service.register(registerDto);
    expect(await service.register(registerDto)).toEqual(first);
    expect(await service.resendVerification(user.email)).toEqual(first);
    await expect(
      service.login({ email: user.email, password: registerDto.password }),
    ).rejects.toThrow('Please verify your email address');

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ isEmailVerified: false }),
    );
    expect(usersService.update).not.toHaveBeenCalled();
    expect(redisService.set).not.toHaveBeenCalled();
  });

  it('keeps the account unverified when SMTP delivery fails', async () => {
    process.env.USE_DIRECT_EMAIL = 'true';
    const sendMail = jest.fn().mockRejectedValue(new Error('SMTP unavailable'));
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >);
    usersService.create.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.invalid',
      isEmailVerified: false,
    });

    await service.register({
      email: 'new@example.invalid',
      password: 'Password123',
      name: 'New User',
      consentGivenAt: new Date().toISOString(),
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(sendMail).toHaveBeenCalled();
    expect(usersService.update).not.toHaveBeenCalled();
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
      sessionVersion: 0,
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

    usersService.findById.mockResolvedValue({ ...mockUser, sessionVersion: 1 });
    await expect(service.refresh(res.refreshToken)).rejects.toThrow(
      'Invalid or expired refresh token',
    );
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
      sessionVersion: 2,
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
      expect(redisStore.get(resetKey!)).toBe('2:user-reset-1');

      // Test resetPassword with a known raw token
      const rawResetToken = 'my-raw-reset-token-12345';
      const rawHash = crypto
        .createHash('sha256')
        .update(rawResetToken)
        .digest('hex');
      redisStore.set(`reset-password:${rawHash}`, '2:user-reset-1');

      const resetRes = await service.resetPassword(
        rawResetToken,
        'NewSecretPassword123',
      );
      expect(resetRes.message).toContain('successfully reset');
      expect(usersService.replacePassword).toHaveBeenCalledWith(
        'user-reset-1',
        2,
        'hashed-password',
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
    expect(usersService.replacePassword).toHaveBeenCalledWith(
      'user-legacy',
      0,
      'hashed-password',
    );
    expect(redisStore.has('reset-password:legacy-raw-token')).toBe(false);
  });

  it('rejects old reset links after a password change or a concurrent reset', async () => {
    redisStore.set('reset-password:old-token', '2:user-legacy');
    usersService.replacePassword.mockResolvedValue(false);

    await expect(
      service.resetPassword('old-token', 'NewPassword123'),
    ).rejects.toThrow('Invalid or expired reset token');
  });

  function mockGoogleProfile(profile: Record<string, unknown>) {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ access_token: 'provider-token' }))
      .mockResolvedValueOnce(Response.json(profile));
  }

  it('rejects Google profiles with an unverified email', async () => {
    mockGoogleProfile({
      sub: 'google-id',
      email: 'new@gmail.com',
      email_verified: false,
    });

    await expect(service.handleGoogleCallback('oauth-code')).rejects.toThrow(
      'Google did not provide a verified email address',
    );
    expect(usersService.findByGoogleId).not.toHaveBeenCalled();
    expect(redisService.set).not.toHaveBeenCalled();
  });

  it('does not link an existing account based on matching email', async () => {
    mockGoogleProfile({
      sub: 'new-google-id',
      email: 'existing@gmail.com',
      email_verified: true,
    });
    usersService.findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(service.handleGoogleCallback('oauth-code')).rejects.toThrow(
      'An account already uses this email',
    );
    expect(usersService.update).not.toHaveBeenCalled();
    expect(redisService.set).not.toHaveBeenCalled();
  });

  it('requires direct verification for new Google accounts with external email', async () => {
    const email = 'new@example.invalid';
    mockGoogleProfile({ sub: 'google-id', email, email_verified: true });
    usersService.create.mockResolvedValue({
      id: 'google-user',
      email,
      isEmailVerified: false,
    });

    await expect(service.handleGoogleCallback('oauth-code')).rejects.toThrow(
      'Verify your email',
    );
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ isEmailVerified: false, passwordHash: null }),
    );
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send-verification',
      expect.objectContaining({ email }),
    );
    expect([...redisStore.keys()]).toEqual([
      expect.stringMatching(/^verify-email:/),
    ]);
  });

  it('issues a refresh session for a previously linked and verified Google account', async () => {
    mockGoogleProfile({
      sub: 'google-id',
      email: 'existing@example.invalid',
      email_verified: true,
    });
    usersService.findByGoogleId.mockResolvedValue({
      id: 'google-user',
      isEmailVerified: true,
      sessionVersion: 2,
    });

    await expect(service.handleGoogleCallback('oauth-code')).resolves.toEqual({
      refreshToken: expect.any(String),
    });
    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect([...redisStore.values()]).toEqual(['2:google-user']);
  });
});
