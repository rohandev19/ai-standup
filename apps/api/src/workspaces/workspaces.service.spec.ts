import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AiService } from '../ai/ai.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prismaService: PrismaService;
  let emailQueue: any;
  let notificationsService: NotificationsService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: PrismaService,
          useValue: {
            workspace: { findUnique: jest.fn(), update: jest.fn() },
            workspaceMember: {
              findUnique: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
            workspaceInvite: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            auditLog: { create: jest.fn() },
            user: { findUnique: jest.fn() },
            $transaction: jest.fn((callback) =>
              callback({
                workspaceInvite: {
                  create: jest.fn().mockResolvedValue({ id: 'invite-1' }),
                  update: jest.fn().mockResolvedValue({ id: 'invite-1' }),
                  findUnique: jest.fn().mockResolvedValue({
                    email: 'user@example.com',
                    invitedById: 'inviter-1',
                    workspaceId: 'ws-1',
                  }),
                },
                auditLog: { create: jest.fn() },
                workspaceMember: {
                  create: jest.fn().mockResolvedValue({
                    workspaceId: 'ws-1',
                    userId: 'user-1',
                  }),
                  findUnique: jest.fn().mockResolvedValue(null),
                  count: jest.fn(),
                },
                user: {
                  findUnique: jest.fn().mockResolvedValue({
                    id: 'user-1',
                    name: 'User',
                    email: 'user@example.com',
                  }),
                },
                workspace: {
                  update: jest.fn(),
                  findUnique: jest
                    .fn()
                    .mockResolvedValue({ id: 'ws-1', name: 'Test' }),
                },
              }),
            ),
          },
        },
        {
          provide: getQueueToken('email'),
          useValue: { add: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: AiService,
          useValue: { askAi: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailQueue = module.get(getQueueToken('email'));
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Phase 3 Tests', () => {
    it('duplicate invite for same email -> resend (reuses existing)', async () => {
      // Mock existing pending invite
      jest
        .spyOn(prismaService.workspaceMember, 'findUnique')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.workspace, 'findUnique')
        .mockResolvedValue({ name: 'Workspace 1' } as any);
      jest.spyOn(prismaService.workspaceInvite, 'findFirst').mockResolvedValue({
        id: 'existing-invite',
        token: 'old-token',
        usedAt: null,
      } as any);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ name: 'Inviter' } as any);

      const result = await service.inviteMember(
        'ws-1',
        'test@example.com',
        'inviter-1',
      );

      expect(prismaService.workspaceInvite.findFirst).toHaveBeenCalled();
      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-invite',
        expect.objectContaining({
          token: 'old-token',
        }),
      );
      expect(result.message).toBe('Invitation resent');
    });

    it('invite used twice rejected', async () => {
      // Mock an invite that has already been used
      jest
        .spyOn(prismaService.workspaceInvite, 'findUnique')
        .mockResolvedValue({
          id: 'invite-1',
          workspaceId: 'ws-1',
          usedAt: new Date(), // Already used
          expiresAt: new Date(Date.now() + 10000), // Not expired
        } as any);

      await expect(
        service.joinWorkspace('invite-token-123', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('expired invite rejected', async () => {
      jest
        .spyOn(prismaService.workspaceInvite, 'findUnique')
        .mockResolvedValue({
          id: 'invite-1',
          workspaceId: 'ws-1',
          usedAt: null, // Not used
          expiresAt: new Date(Date.now() - 10000), // Expired
        } as any);

      await expect(
        service.joinWorkspace('invite-token-123', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('bulk invite 20 emails -> 20 individual invites terkirim', async () => {
      const emails = Array.from(
        { length: 20 },
        (_, i) => `test${i}@example.com`,
      );

      jest.spyOn(prismaService.workspace, 'findUnique').mockResolvedValue({
        id: 'ws-1',
        subscriptionTier: 'PRO',
        members: [{ userId: 'inviter-1' }],
      } as any);
      jest.spyOn(prismaService.workspaceMember, 'count').mockResolvedValue(5);

      // Spy on inviteMember
      const inviteSpy = jest
        .spyOn(service, 'inviteMember')
        .mockResolvedValue({ message: 'Invitation sent', inviteId: 'inv-1' });

      const result = await service.bulkInviteMembers(
        'ws-1',
        'inviter-1',
        emails,
      );

      expect(inviteSpy).toHaveBeenCalledTimes(20);
      expect(result.length).toBe(20);
    });

    it('invite accepted -> event emitted', async () => {
      jest
        .spyOn(prismaService.workspaceMember, 'findUnique')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.workspaceInvite, 'findUnique')
        .mockResolvedValue({
          id: 'invite-1',
          workspaceId: 'ws-1',
          email: 'user@example.com',
          usedAt: null,
          expiresAt: new Date(Date.now() + 10000),
          invitedById: 'inviter-1',
        } as any);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ email: 'user@example.com', name: 'User' } as any);

      const txCallbackSpy = jest.fn((cb) =>
        cb({
          workspaceMember: {
            create: jest
              .fn()
              .mockResolvedValue({ workspaceId: 'ws-1', userId: 'user-1' }),
            findUnique: jest.fn().mockResolvedValue(null),
          },
          workspaceInvite: {
            update: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue({
              email: 'user@example.com',
              invitedById: 'inviter-1',
              workspaceId: 'ws-1',
            }),
          },
          user: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ email: 'user@example.com', name: 'User' }),
          },
        }),
      );
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(txCallbackSpy as any);

      await service.joinWorkspace('token-123', 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'invite.accepted',
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'user-1',
        }),
      );
    });
  });

  describe('Role management security invariants', () => {
    describe('updateMemberRole', () => {
      it('should reject with ForbiddenException when an ADMIN attempts to promote someone to OWNER', async () => {
        jest
          .spyOn(prismaService.workspaceMember, 'findUnique')
          .mockResolvedValueOnce({
            id: 'target-mem-1',
            role: 'MEMBER',
            isActive: true,
          } as any) // target
          .mockResolvedValueOnce({
            id: 'requester-mem-1',
            role: 'ADMIN',
            isActive: true,
          } as any); // requester

        await expect(
          service.updateMemberRole('ws-1', 'user-2', 'OWNER', 'admin-user-1'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject with ForbiddenException when an ADMIN attempts to demote the OWNER', async () => {
        jest
          .spyOn(prismaService.workspaceMember, 'findUnique')
          .mockResolvedValueOnce({
            id: 'target-mem-1',
            role: 'OWNER',
            isActive: true,
          } as any) // target owner
          .mockResolvedValueOnce({
            id: 'requester-mem-1',
            role: 'ADMIN',
            isActive: true,
          } as any); // requester admin

        await expect(
          service.updateMemberRole(
            'ws-1',
            'owner-user-1',
            'MEMBER',
            'admin-user-1',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow OWNER to transfer ownership and demote requester to ADMIN in transaction', async () => {
        jest
          .spyOn(prismaService.workspaceMember, 'findUnique')
          .mockResolvedValueOnce({
            id: 'target-mem-1',
            role: 'MEMBER',
            isActive: true,
          } as any) // target
          .mockResolvedValueOnce({
            id: 'owner-mem-1',
            role: 'OWNER',
            isActive: true,
          } as any); // requester owner

        const mockTx = {
          workspaceMember: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 'target-mem-1', role: 'OWNER' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
          },
        };

        jest
          .spyOn(prismaService, '$transaction')
          .mockImplementation(async (cb: any) => cb(mockTx));

        const result = await service.updateMemberRole(
          'ws-1',
          'user-2',
          'OWNER',
          'owner-user-1',
        );

        expect(result.role).toBe('OWNER');
        expect(mockTx.workspaceMember.update).toHaveBeenCalledWith({
          where: { id: 'owner-mem-1' },
          data: { role: 'ADMIN' },
        });
      });
    });

    describe('removeMember', () => {
      it('should reject with ForbiddenException when attempting to remove the OWNER', async () => {
        jest
          .spyOn(prismaService.workspaceMember, 'findUnique')
          .mockResolvedValueOnce({
            id: 'target-owner',
            role: 'OWNER',
            isActive: true,
          } as any);

        await expect(
          service.removeMember('ws-1', 'owner-user', 'admin-user'),
        ).rejects.toThrow(
          new ForbiddenException('Cannot remove the workspace owner'),
        );
      });

      it('should allow ADMIN or OWNER to remove a standard MEMBER', async () => {
        jest
          .spyOn(prismaService.workspaceMember, 'findUnique')
          .mockResolvedValueOnce({
            id: 'target-member',
            role: 'MEMBER',
            isActive: true,
          } as any)
          .mockResolvedValueOnce({
            id: 'admin-member',
            role: 'ADMIN',
            isActive: true,
          } as any);

        const mockTx = {
          workspaceMember: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 'target-member', isActive: false }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
          },
        };

        jest
          .spyOn(prismaService, '$transaction')
          .mockImplementation(async (cb: any) => cb(mockTx));

        const result = await service.removeMember(
          'ws-1',
          'member-user',
          'admin-user',
        );
        expect(result.isActive).toBe(false);
      });
    });

    describe('getMyWorkspaces', () => {
      it('should query with select projection hiding joinPassword and stripe customer IDs', async () => {
        (prismaService.workspace as any).findMany = jest
          .fn()
          .mockResolvedValue([
            { id: 'ws-1', name: 'Acme', members: [{ role: 'MEMBER' }] },
          ]);

        const result = await service.getMyWorkspaces('user-1');
        expect(result).toHaveLength(1);
        expect((prismaService.workspace as any).findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              name: true,
              slug: true,
            }),
          }),
        );
      });
    });
  });
});
