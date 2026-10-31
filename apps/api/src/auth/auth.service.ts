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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

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
        const nodemailer = await import('nodemailer');
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const transporter = nodemailer.createTransport({
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

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      if (!existingUser.isEmailVerified && !this.hasConfiguredSmtp()) {
        await this.usersService.update(existingUser.id, {
          isEmailVerified: true,
        });
      }
      // Generic response to prevent user enumeration
      return {
        message:
          'If the email is valid, check your inbox for further instructions.',
      };
    }

    const saltRounds = 12; // Increased from 10 for better security against brute-force
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const consentDate = new Date(consentGivenAt);
    const smtpConfigured = this.hasConfiguredSmtp();

    const user = await this.usersService.create({
      email,
      name,
      passwordHash,
      consentGivenAt: consentDate,
      isEmailVerified: !smtpConfigured,
    });

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store in Redis (expires in 24 hours = 86400 seconds)
    await this.redisService.set(
      `verify-email:${verificationToken}`,
      user.id,
      'EX',
      86400,
    );

    if (smtpConfigured) {
      const frontendUrl =
        process.env.FRONTEND_URL || 'https://www.aistandup.app';
      void this.sendEmailSafe({
        to: user.email,
        subject: 'Verify Your Email Address',
        text: `Welcome! Please verify your email address by clicking this link: ${frontendUrl}/verify-email/${verificationToken}\n\nThis link will expire in 24 hours.`,
        jobName: 'send-verification',
        jobData: {
          email: user.email,
          token: verificationToken,
        },
      }).then(async (sent) => {
        if (!sent) {
          await this.usersService.update(user.id, { isEmailVerified: true });
        }
      });
    }

    return {
      message:
        'If the email is valid, check your inbox for further instructions.',
    };
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

    // Check if email is verified
    if (!user.isEmailVerified) {
      if (!this.hasConfiguredSmtp()) {
        await this.usersService.update(user.id, { isEmailVerified: true });
      } else {
        throw new HttpException(
          'Please verify your email address before logging in. Check your inbox for the verification link.',
          HttpStatus.FORBIDDEN,
        );
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

    // Generate Tokens
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Refresh Token (expires in 7 days = 604800 seconds)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    await this.redisService.set(
      `refresh-token:${refreshToken}`,
      user.id,
      'EX',
      604800,
    );

    return {
      accessToken,
      refreshToken, // Will be returned to controller to set as HttpOnly cookie
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken)
      throw new UnauthorizedException('No refresh token provided');

    // Check if token exists in Redis
    const userId = await this.redisService.get(`refresh-token:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    // Generate new Access Token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      // Remove refresh token from Redis (revokes session)
      await this.redisService.del(`refresh-token:${refreshToken}`);
    }
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const userId = await this.redisService.get(`verify-email:${token}`);

    if (!userId) {
      throw new HttpException(
        'Invalid or expired verification token',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.usersService.update(userId, { isEmailVerified: true });

    // Remove token after successful verification
    await this.redisService.del(`verify-email:${token}`);

    return { message: 'Email successfully verified. You can now login.' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Generic response to prevent email enumeration
      return {
        message:
          'If the email is valid, check your inbox for verification link.',
      };
    }

    if (user.isEmailVerified) {
      return {
        message: 'This email is already verified. You can login now.',
      };
    }

    if (!this.hasConfiguredSmtp()) {
      await this.usersService.update(user.id, { isEmailVerified: true });
      return {
        message: 'This email is already verified. You can login now.',
      };
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store in Redis (expires in 24 hours = 86400 seconds)
    await this.redisService.set(
      `verify-email:${verificationToken}`,
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

    return {
      message: 'If the email is valid, check your inbox for verification link.',
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Store in Redis (expires in 1 hour = 3600 seconds)
      await this.redisService.set(
        `reset-password:${resetToken}`,
        user.id,
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
    const userId = await this.redisService.get(`reset-password:${token}`);

    if (!userId) {
      throw new HttpException(
        'Invalid or expired reset token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const saltRounds = 12; // Increased for better security
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.usersService.update(userId, { passwordHash });

    await this.redisService.del(`reset-password:${token}`);

    return { message: 'Password has been successfully reset.' };
  }

  getGoogleAuthUrl(): string {
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

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      this.logger.error('Google token exchange failed:', tokenData);
      throw new HttpException(
        tokenData.error_description || 'Failed to authenticate with Google',
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

    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.email) {
      this.logger.error('Failed to fetch Google profile:', profile);
      throw new HttpException(
        'Failed to retrieve Google profile information',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Find or create user
    let user = await this.usersService.findByGoogleId(profile.sub);

    if (!user) {
      // Check if user exists by email (registered previously via email/password)
      const existingUserByEmail = await this.usersService.findByEmail(
        profile.email,
      );

      if (existingUserByEmail) {
        // Link Google ID and mark email as verified
        user = await this.usersService.update(existingUserByEmail.id, {
          googleId: profile.sub,
          isEmailVerified: true,
          avatarUrl: existingUserByEmail.avatarUrl || profile.picture || null,
        });
      } else {
        // Create new Google user
        user = await this.usersService.create({
          email: profile.email,
          name: profile.name || profile.email.split('@')[0],
          avatarUrl: profile.picture || null,
          googleId: profile.sub,
          authProvider: 'GOOGLE',
          isEmailVerified: true,
          passwordHash: null,
        });
      }
    } else {
      // Refresh avatar if not set
      if (!user.avatarUrl && profile.picture) {
        user = await this.usersService.update(user.id, {
          avatarUrl: profile.picture,
        });
      }
    }

    // 4. Generate system tokens
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = crypto.randomBytes(40).toString('hex');
    await this.redisService.set(
      `refresh-token:${refreshToken}`,
      user.id,
      'EX',
      604800,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
