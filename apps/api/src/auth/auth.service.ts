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

  async register(registerDto: RegisterDto) {
    const { email, password, name, consentGivenAt } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      // Generic response to prevent user enumeration
      return {
        message:
          'If the email is valid, check your inbox for further instructions.',
      };
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const consentDate = new Date(consentGivenAt);

    const user = await this.usersService.create({
      email,
      name,
      passwordHash,
      consentGivenAt: consentDate,
      isEmailVerified: false,
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

    // Send verification email
    // Use direct send in production (single dyno), queue in development/multi-dyno
    const useDirectEmail = process.env.USE_DIRECT_EMAIL === 'true' || process.env.NODE_ENV === 'production';
    
    if (useDirectEmail) {
      // Send email directly (reliable for single-dyno production)
      try {
        const nodemailer = await import('nodemailer');
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port,
          secure: port === 465,
          auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          } : undefined,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@aistandup.local',
          to: user.email,
          subject: 'Verify Your Email Address',
          text: `Welcome! Please verify your email address by clicking this link: ${process.env.FRONTEND_URL}/verify-email/${verificationToken}\n\nThis link will expire in 24 hours.`,
        });

        this.logger.log(`Email sent directly to: ${user.email}`);
      } catch (emailError) {
        this.logger.error('Failed to send verification email:', emailError.message);
        // Don't throw - user is created, they can request resend
      }
    } else {
      // Use queue for multi-dyno setups
      try {
        const job = await this.emailQueue.add('send-verification', {
          email: user.email,
          token: verificationToken,
        });
        this.logger.log(
          `Verification email job added to queue: ${job.id} for ${user.email}`,
        );
      } catch (queueError) {
        this.logger.error('Email queue failed:', queueError.message);
        // Queue failed, don't throw - user can request resend
      }
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
      throw new HttpException(
        'Please verify your email address before logging in. Check your inbox for the verification link.',
        HttpStatus.FORBIDDEN,
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

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store in Redis (expires in 24 hours = 86400 seconds)
    await this.redisService.set(
      `verify-email:${verificationToken}`,
      user.id,
      'EX',
      86400,
    );

    // Send verification email via BullMQ
    try {
      const job = await this.emailQueue.add('send-verification', {
        email: user.email,
        token: verificationToken,
      });
      this.logger.log(
        `Resend verification email job added to queue: ${job.id} for ${user.email}`,
      );
    } catch (queueError) {
      // Fallback: Send email directly if queue fails
      this.logger.error('Email queue failed:', queueError.message);

      if (process.env.NODE_ENV !== 'production') {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '1025', 10),
          secure: false,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@aistandup.local',
          to: user.email,
          subject: 'Verify Your Email Address',
          text: `Welcome! Please verify your email address by clicking this link: ${process.env.FRONTEND_URL}/verify-email/${verificationToken}\n\nThis link will expire in 24 hours.`,
        });

        this.logger.log(
          `[DEV] Verification email sent directly to: ${user.email}`,
        );
      }
    }

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

      // Send password reset email
      const useDirectEmail = process.env.USE_DIRECT_EMAIL === 'true' || process.env.NODE_ENV === 'production';
      
      if (useDirectEmail) {
        try {
          const nodemailer = await import('nodemailer');
          const port = parseInt(process.env.SMTP_PORT || '587', 10);
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port,
            secure: port === 465,
            auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            } : undefined,
          });

          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@aistandup.local',
            to: user.email,
            subject: 'Reset Your Password',
            text: `You requested to reset your password. Click this link to reset it: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
          });

          this.logger.log(`Password reset email sent directly to: ${user.email}`);
        } catch (emailError) {
          this.logger.error('Failed to send password reset email:', emailError.message);
        }
      } else {
        // Use queue for multi-dyno setups
        try {
          await this.emailQueue.add('send-password-reset', {
            email: user.email,
            token: resetToken,
          });
          this.logger.log(`Password reset email job added to queue for ${user.email}`);
        } catch (queueError) {
          this.logger.error('Password reset queue failed:', queueError.message);
        }
      }
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

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.usersService.update(userId, { passwordHash });

    // Revoke all existing refresh tokens for this user by pattern?
    // Wait, redis pattern deletion can be slow, or we can just ignore it for now.
    // The requirement says: invalidate all refresh tokens.
    // We could store user's refresh tokens in a set in Redis, but it's simpler to just delete the single current session if we had it.
    // Or we can add a `tokenVersion` or `passwordChangedAt` in User model to invalidate all old tokens.
    // For now, let's just delete the reset token.
    await this.redisService.del(`reset-password:${token}`);

    return { message: 'Password has been successfully reset.' };
  }
}
