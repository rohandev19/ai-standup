import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '../common/prisma/prisma.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('new-hash'),
}));

describe('password and session version', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.invalid',
    passwordHash: 'current-hash',
    isEmailVerified: true,
    sessionVersion: 0,
  };
  const prisma = { user: { findUnique: jest.fn(), updateMany: jest.fn() } };
  const events = { emit: jest.fn() };
  const users = new UsersService(
    prisma as unknown as PrismaService,
    events as unknown as EventEmitter2,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    user.sessionVersion = 0;
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string; sessionVersion?: number } }) =>
        Promise.resolve(
          where.id === user.id &&
            (where.sessionVersion === undefined ||
              where.sessionVersion === user.sessionVersion)
            ? { ...user }
            : null,
        ),
    );
    prisma.user.updateMany.mockImplementation(
      ({ where }: { where: { sessionVersion: number } }) => {
        if (where.sessionVersion !== user.sessionVersion) {
          return Promise.resolve({ count: 0 });
        }
        user.sessionVersion++;
        return Promise.resolve({ count: 1 });
      },
    );
  });

  it('invalidates older access claims when the password changes', async () => {
    const priorSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-session-secret';
    try {
      const jwtStrategy = new JwtStrategy(users);
      const claims = { sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 };
      await expect(jwtStrategy.validate(claims)).resolves.toMatchObject({
        id: user.id,
      });

      await users.changePassword(
        user.id,
        'CurrentPassword123',
        'NewPassword123',
      );
      await expect(jwtStrategy.validate(claims)).rejects.toThrow(
        'Session is no longer valid',
      );
      await expect(
        jwtStrategy.validate({ ...claims, sessionVersion: 1 }),
      ).resolves.toMatchObject({ id: user.id });
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: user.id, sessionVersion: 0 },
        data: { passwordHash: 'new-hash', sessionVersion: { increment: 1 } },
      });
      expect(events.emit).toHaveBeenCalledWith('auth.sessions_revoked', {
        userId: user.id,
        sessionVersion: 1,
      });
    } finally {
      if (priorSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = priorSecret;
    }
  });

  it('rejects reusing an older password update version', async () => {
    await expect(users.replacePassword(user.id, 0, 'new-hash')).resolves.toBe(
      true,
    );
    await expect(
      users.replacePassword(user.id, 0, 'another-hash'),
    ).resolves.toBe(false);
    expect(events.emit).toHaveBeenCalledTimes(1);
  });
});
