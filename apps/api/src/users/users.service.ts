import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface AccessTokenClaims {
  sub: string;
  sessionVersion?: number;
  exp: number;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  findActiveSession({ sub, sessionVersion = 0 }: AccessTokenClaims) {
    if (!sub || !Number.isSafeInteger(sessionVersion) || sessionVersion < 0) {
      return null;
    }
    return this.prisma.user.findUnique({
      where: { id: sub, sessionVersion, isEmailVerified: true },
      select: { id: true, email: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async incrementFailedLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
    });
  }

  async lockAccount(
    id: string,
    lockDurationMinutes: number = 30,
  ): Promise<User> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDurationMinutes);

    return this.prisma.user.update({
      where: { id },
      data: {
        isLocked: true,
        lockedUntil,
      },
    });
  }

  async resetFailedLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Accounts created with Google cannot change password this way',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    const updated = await this.replacePassword(
      id,
      user.sessionVersion,
      await bcrypt.hash(newPassword, 12),
    );
    if (!updated) {
      throw new UnauthorizedException('Password changed. Sign in again.');
    }

    return { message: 'Password updated successfully' };
  }

  async replacePassword(
    id: string,
    sessionVersion: number,
    passwordHash: string,
  ) {
    const { count } = await this.prisma.user.updateMany({
      where: { id, sessionVersion },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (!count) return false;

    this.events.emit('auth.sessions_revoked', {
      userId: id,
      sessionVersion: sessionVersion + 1,
    });
    return true;
  }
}
