import { WorkspaceMembershipGuard } from './workspace-membership.guard';
import {
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';

describe('WorkspaceMembershipGuard', () => {
  let guard: WorkspaceMembershipGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    prisma = {
      workspaceMember: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    } as any;

    guard = new WorkspaceMembershipGuard(reflector, prisma);
  });

  const createMockContext = (reqData: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => reqData,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as any;

  it('should throw ForbiddenException if user is not attached to request', async () => {
    const context = createMockContext({ user: null });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw BadRequestException if workspaceId is missing', async () => {
    const context = createMockContext({
      user: { id: 'user-1' },
      params: {},
      query: {},
      body: {},
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ForbiddenException if user is not a member (tenant isolation)', async () => {
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { workspaceId: 'ws-1' },
      headers: {},
    });

    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValueOnce(
      null,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.workspaceMember.findUnique).toHaveBeenCalledWith({
      where: { workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-1' } },
    });
  });

  it('should throw ForbiddenException if member is inactive', async () => {
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { workspaceId: 'ws-1' },
      headers: {},
    });

    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValueOnce({
      workspaceId: 'ws-1',
      userId: 'user-1',
      isActive: false,
      role: WorkspaceRole.MEMBER,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should pass if member is active and no specific roles are required', async () => {
    const req = {
      user: { id: 'user-1' },
      params: { workspaceId: 'ws-1' },
      headers: {},
    } as any;
    const context = createMockContext(req);

    reflector.getAllAndOverride.mockReturnValue(undefined);

    const mockMembership = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      isActive: true,
      role: WorkspaceRole.MEMBER,
    };
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValueOnce(
      mockMembership,
    );

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // Should attach membership to request
    expect(req.workspaceMembership).toEqual(mockMembership);
  });

  it('should throw ForbiddenException if user lacks required role', async () => {
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { workspaceId: 'ws-1' },
      headers: {},
    });

    reflector.getAllAndOverride.mockReturnValue([
      WorkspaceRole.ADMIN,
      WorkspaceRole.OWNER,
    ]);

    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValueOnce({
      workspaceId: 'ws-1',
      userId: 'user-1',
      isActive: true,
      role: WorkspaceRole.MEMBER,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should pass if user has required role', async () => {
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { workspaceId: 'ws-1' },
      headers: {},
    });

    reflector.getAllAndOverride.mockReturnValue([
      WorkspaceRole.ADMIN,
      WorkspaceRole.OWNER,
    ]);

    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValueOnce({
      workspaceId: 'ws-1',
      userId: 'user-1',
      isActive: true,
      role: WorkspaceRole.OWNER,
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
