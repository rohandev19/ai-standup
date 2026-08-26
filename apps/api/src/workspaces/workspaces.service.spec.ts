import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';

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
});
