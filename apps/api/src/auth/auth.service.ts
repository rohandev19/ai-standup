import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { createTransport } from 'nodemailer';

export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

const VERIFICATION_MESSAGE =
  'If the email is valid, check your inbox for verification instructions.';

type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'sessionVersion'>;

type GoogleProfile = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async getStoredToken(
    prefix: 'verify-email' | 'reset-password' | 'refresh-token',
    token: string,
  ): Promise<{ value: string | null; key: string }> {
    const hashedKey = `${prefix}:${this.hashToken(token)}`;
    const value = (await this.redisService.get(hashedKey)) as string | null;
    if (value) return { value, key: hashedKey };

    // Existing tokens may still be stored under their un-hashed keys.
    const legacyKey = `${prefix}:${token}`;
    return {
      value: (await this.redisService.get(legacyKey)) as string | null,
      key: legacyKey,
    };
  }

  private sessionTokenValue(user: SessionUser): string {
    return `${user.sessionVersion}:${user.id}`;
  }

  private async getVersionedToken(
    prefix: 'reset-password' | 'refresh-token',
    token: string,
  ) {
    const { value, key } = await this.getStoredToken(prefix, token);
    if (!value) return null;

    // Tokens issued before session versioning stored only the user ID.
    const separator = value.indexOf(':');
    if (separator === -1) return { userId: value, version: 0, key };

    const version = Number(value.slice(0, separator));
    const userId = value.slice(separator + 1);
    if (
      !userId ||
      separator === 0 ||
      !Number.isSafeInteger(version) ||
      version < 0
    ) {
      return null;
    }
    return { userId, version, key };
  }

  private async issueRefreshToken(user: SessionUser): Promise<string> {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    await this.redisService.set(
      `refresh-token:${this.hashToken(refreshToken)}`,
      this.sessionTokenValue(user),
      'EX',
      REFRESH_TOKEN_TTL,
    );
    return refreshToken;
  }

  private sessionResponse(user: SessionUser) {
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        sessionVersion: user.sessionVersion,
      }),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  private hasConfiguredSmtp(): boolean {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) return false;
    if (process.env.NODE_ENV === 'production') {
      return Boolean(
        smtpHost !== 'localhost' &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS,
      );
    }
    return true;
  }

  private async sendEmailSafe(options: {
    to: string;
    subject: string;
    text: string;
    jobName: string;
    jobData: Record<string, unknown>;
  }): Promise<boolean> {
    if (!this.hasConfiguredSmtp()) {
      this.logger.warn(
        `SMTP not configured; skipping email "${options.subject}" to ${options.to}`,
      );
      return false;
    }

    const sendDirectly = async (): Promise<boolean> => {
      try {
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const transporter = createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port,
          secure: port === 465,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
              ? {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS,
                }
              : undefined,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@aistandup.local',
          to: options.to,
          subject: options.subject,
          text: options.text,
        });

        this.logger.log(`Email sent directly to: ${options.to}`);
        return true;
      } catch (emailError: unknown) {
        this.logger.error(
          `Failed to send email "${options.subject}":`,
          (emailError as Error)?.message,
        );
        return false;
      }
    };

    const useDirectEmail =
      process.env.USE_DIRECT_EMAIL === 'true' ||
      process.env.NODE_ENV === 'production';

    if (useDirectEmail) {
      return sendDirectly();
    }

    try {
      const queuePromise = this.emailQueue.add(
        options.jobName,
        options.jobData,
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Email queue add timed out')), 2000),
      );
      const job = await Promise.race([queuePromise, timeoutPromise]);
      this.logger.log(
        `Email job (${options.jobName}) added to queue: ${job.id} for ${options.to}`,
      );
      return true;
    } catch (queueError: unknown) {
      this.logger.error(
        'Email queue failed, falling back to direct send:',
        (queueError as Error)?.message,
      );
      return sendDirectly();
    }
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, consentGivenAt } = registerDto;

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      if (!existing.isEmailVerified) await this.sendVerification(existing);
      return { message: VERIFICATION_MESSAGE };
    }

    const user = await this.usersService.create({
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      consentGivenAt: new Date(consentGivenAt),
      isEmailVerified: false,
    });

    await this.sendVerification(user);
    return { message: VERIFICATION_MESSAGE };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new HttpException(
          'Account is locked due to multiple failed login attempts. Try again later.',
          HttpStatus.FORBIDDEN,
        );
      } else {
        // Lock expired, reset
        await this.usersService.resetFailedLogin(user.id);
      }
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account was created with Google. Please sign in using Google.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const updatedUser = await this.usersService.incrementFailedLogin(user.id);

      // Account Lockout logic (Requirement 9.3 for auth security, 10 attempts -> 30 min)
      if (updatedUser.failedLoginAttempts >= 10 && !updatedUser.isLocked) {
        await this.usersService.lockAccount(user.id, 30);
        // TODO: Enqueue email notification to user about lockout
        throw new HttpException(
          'Account is locked due to multiple failed login attempts. Try again later.',
          HttpStatus.FORBIDDEN,
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0) {
      await this.usersService.resetFailedLogin(user.id);
    }

    if (!user.isEmailVerified) {
      throw new HttpException(
        'Please verify your email address before logging in. Check your inbox for the verification link.',
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      ...this.sessionResponse(user),
      refreshToken: await this.issueRefreshToken(user),
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const stored = await this.getVersionedToken('refresh-token', refreshToken);
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(stored.userId);
    if (
      !user ||
      !user.isEmailVerified ||
      user.sessionVersion !== stored.version
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.sessionResponse(user);
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      // Remove refresh token from Redis (revokes session)
      await this.redisService.del(
        `refresh-token:${this.hashToken(refreshToken)}`,
      );
      await this.redisService.del(`refresh-token:${refreshToken}`);
    }
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const { value: userId, key } = await this.getStoredToken(
      'verify-email',
      token,
    );

    if (!userId) {
      throw new HttpException(
        'Invalid or expired verification token',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.usersService.update(userId, { isEmailVerified: true });

    // Remove token after successful verification
    await this.redisService.del(key);

    return { message: 'Email successfully verified. You can now login.' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && !user.isEmailVerified) await this.sendVerification(user);
    return { message: VERIFICATION_MESSAGE };
  }

  private async sendVerification(user: Pick<User, 'id' | 'email'>) {
    if (!this.hasConfiguredSmtp()) {
      this.logger.warn('SMTP not configured; email verification was not sent');
      return;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store in Redis (expires in 24 hours = 86400 seconds)
    await this.redisService.set(
      `verify-email:${this.hashToken(verificationToken)}`,
      user.id,
      'EX',
      86400,
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.aistandup.app';
    void this.sendEmailSafe({
      to: user.email,
      subject: 'Verify Your Email Address',
      text: `Welcome! Please verify your email address by clicking this link: ${frontendUrl}/verify-email/${verificationToken}\n\nThis link will expire in 24 hours.`,
      jobName: 'send-verification',
      jobData: {
        email: user.email,
        token: verificationToken,
      },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Store in Redis (expires in 1 hour = 3600 seconds)
      await this.redisService.set(
        `reset-password:${this.hashToken(resetToken)}`,
        this.sessionTokenValue(user),
        'EX',
        3600,
      );

      const frontendUrl =
        process.env.FRONTEND_URL || 'https://www.aistandup.app';
      void this.sendEmailSafe({
        to: user.email,
        subject: 'Reset Your Password',
        text: `You requested to reset your password. Click this link to reset it: ${frontendUrl}/reset-password?token=${resetToken}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
        jobName: 'send-password-reset',
        jobData: {
          email: user.email,
          token: resetToken,
        },
      });
    }

    // Generic response
    return {
      message:
        'If the email is valid, check your inbox for instructions to reset your password.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const stored = await this.getVersionedToken('reset-password', token);
    if (!stored) {
      throw new HttpException(
        'Invalid or expired reset token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.usersService.replacePassword(
      stored.userId,
      stored.version,
      await bcrypt.hash(newPassword, 12),
    );
    if (!updated) {
      throw new HttpException(
        'Invalid or expired reset token',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.redisService.del(stored.key);
    return { message: 'Password has been successfully reset.' };
  }

  getGoogleAuthUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.FRONTEND_URL || 'https://www.aistandup.app'}/api/auth/google/callback`;

    if (!clientId) {
      throw new HttpException(
        'Google OAuth client ID is not configured in .env',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      state,
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });

    return `${rootUrl}?${params.toString()}`;
  }

  async handleGoogleCallback(code: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.FRONTEND_URL || 'https://www.aistandup.app'}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new HttpException(
        'Google OAuth credentials are not configured in .env',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10000),
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: unknown;
    } | null;

    if (
      !tokenResponse.ok ||
      typeof tokenData?.access_token !== 'string' ||
      !tokenData.access_token
    ) {
      this.logger.warn(
        `Google token exchange failed (HTTP ${tokenResponse.status})`,
      );
      throw new HttpException(
        'Failed to authenticate with Google',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Fetch user profile with access token
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    const profile = (await profileResponse.json()) as GoogleProfile | null;

    if (
      !profileResponse.ok ||
      typeof profile?.sub !== 'string' ||
      !profile.sub ||
      typeof profile.email !== 'string' ||
      !profile.email ||
      profile.email_verified !== true
    ) {
      throw new HttpException(
        'Google did not provide a verified email address.',
        HttpStatus.FORBIDDEN,
      );
    }

    const email = profile.email.toLowerCase();
    const avatarUrl =
      typeof profile.picture === 'string' ? profile.picture : null;
    let user = await this.usersService.findByGoogleId(profile.sub);
    if (!user) {
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new HttpException(
          'An account already uses this email. Sign in with your original method.',
          HttpStatus.CONFLICT,
        );
      }

      // Google is authoritative for Gmail addresses. Verify external email
      // addresses directly before enabling a new account.
      const isEmailVerified = email.endsWith('@gmail.com');
      user = await this.usersService.create({
        email,
        name:
          typeof profile.name === 'string' ? profile.name : email.split('@')[0],
        avatarUrl,
        googleId: profile.sub,
        authProvider: 'GOOGLE',
        isEmailVerified,
        passwordHash: null,
      });
    }

    if (!user.isEmailVerified) {
      await this.sendVerification(user);
      throw new HttpException(
        'Verify your email, then sign in again with Google.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!user.avatarUrl && avatarUrl) {
      await this.usersService.update(user.id, { avatarUrl });
    }
    return { refreshToken: await this.issueRefreshToken(user) };
  }
}
