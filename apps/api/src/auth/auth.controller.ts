import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  Res,
  UseGuards,
  Req,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthService, REFRESH_TOKEN_TTL } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

const OAUTH_STATE_COOKIE = 'googleOAuthState';

function readCookie(req: Request, name: string): string | undefined {
  const value = req.cookies?.[name] as unknown;
  return typeof value === 'string' ? value : undefined;
}

function authCookieOptions(path: string): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(RateLimitGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(RateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refreshToken = readCookie(req, 'refreshToken');
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = readCookie(req, 'refreshToken');

    res.clearCookie('refreshToken', authCookieOptions('/api/auth'));

    return this.authService.logout(refreshToken);
  }

  @Get('verify-email/:token')
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(RateLimitGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: RequestPasswordResetDto) {
    return this.authService.resendVerification(dto.email);
  }

  @UseGuards(RateLimitGuard)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('google')
  googleAuth(@Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const state = randomBytes(32).toString('hex');
    try {
      const url = this.authService.getGoogleAuthUrl(state);
      res.cookie(OAUTH_STATE_COOKIE, state, {
        ...authCookieOptions('/api/auth/google/callback'),
        maxAge: 10 * 60 * 1000,
      });
      return res.redirect(url);
    } catch {
      return this.redirectToLogin(
        res,
        'Google sign-in is currently unavailable.',
      );
    }
  }

  @Get('google/callback')
  async googleAuthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const expectedState = readCookie(req, OAUTH_STATE_COOKIE);
    if (
      typeof state !== 'string' ||
      !/^[a-f0-9]{64}$/.test(state) ||
      typeof expectedState !== 'string' ||
      !/^[a-f0-9]{64}$/.test(expectedState) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
    ) {
      return this.redirectToLogin(
        res,
        'Google sign-in expired. Please try again.',
      );
    }

    res.clearCookie(
      OAUTH_STATE_COOKIE,
      authCookieOptions('/api/auth/google/callback'),
    );
    if (typeof code !== 'string' || !code) {
      return this.redirectToLogin(res, 'Google sign-in was cancelled.');
    }

    try {
      const { refreshToken } =
        await this.authService.handleGoogleCallback(code);
      this.setRefreshCookie(res, refreshToken);
      return res.redirect(`${this.frontendUrl()}/oauth/callback`);
    } catch (error: unknown) {
      const message =
        error instanceof HttpException && error.getStatus() < 500
          ? error.message
          : 'Google sign-in failed. Please try again.';
      return this.redirectToLogin(res, message);
    }
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      ...authCookieOptions('/api/auth'),
      maxAge: REFRESH_TOKEN_TTL * 1000,
    });
  }

  private frontendUrl() {
    return (process.env.FRONTEND_URL || 'https://www.aistandup.app').replace(
      /\/$/,
      '',
    );
  }

  private redirectToLogin(res: Response, message: string) {
    return res.redirect(
      `${this.frontendUrl()}/login?error=${encodeURIComponent(message)}`,
    );
  }
}
