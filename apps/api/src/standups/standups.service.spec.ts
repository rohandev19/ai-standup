import { Test, TestingModule } from '@nestjs/testing';
import { StandupsService } from './standups.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventsGateway } from '../events/events.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('StandupsService', () => {
  let service: StandupsService;
  let prisma: PrismaService;
  let queue: jest.Mocked<Pick<Queue, 'add'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandupsService,
        {
          provide: PrismaService,
          useValue: {
            standupEntry: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            blockerFlag: {
              deleteMany: jest.fn(),
            },
            workspace: {
              findUnique: jest.fn(),
              findUniqueOrThrow: jest
                .fn()
                .mockResolvedValue({ timezone: 'UTC' }),
            },
            aiSummary: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: getQueueToken('ai-blocker'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            broadcastToWorkspace: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StandupsService>(StandupsService);
    prisma = module.get<PrismaService>(PrismaService);
    queue = module.get(getQueueToken('ai-blocker'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitStandup', () => {
    it('should throw if standup already exists for today', async () => {
      (prisma.standupEntry.findUnique as jest.Mock).mockResolvedValue({
        id: 'exists',
      });
      await expect(
        service.submitStandup('ws-1', 'user-1', 'y', 't', 'b'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create and enqueue AI if blocker exists', async () => {
      (prisma.standupEntry.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.standupEntry.create as jest.Mock).mockResolvedValue({
        id: 'new-id',
        blockerText: 'b',
      });

      await service.submitStandup('ws-1', 'user-1', 'y', 't', 'blocker');
      expect(queue.add).toHaveBeenCalledWith('extract-blockers', {
        standupId: 'new-id',
        blockerText: 'blocker',
      });
    });

    it('should create and NOT enqueue AI if no blocker', async () => {
      (prisma.standupEntry.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.standupEntry.create as jest.Mock).mockResolvedValue({
        id: 'new-id',
      });

      await service.submitStandup('ws-1', 'user-1', 'y', 't', '');
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardState', () => {
    const workspace = {
      id: 'ws-1',
      timezone: 'UTC',
      workingDays: [1, 2, 3, 4, 5, 6, 7],
      standupWindowStart: '00:00',
      standupWindowEnd: '23:59',
      members: [
        {
          userId: 'u-on-time',
          user: { id: 'u-on-time', name: 'A', avatarUrl: null },
        },
        {
          userId: 'u-late',
          user: { id: 'u-late', name: 'B', avatarUrl: null },
        },
        {
          userId: 'u-pending',
          user: { id: 'u-pending', name: 'C', avatarUrl: null },
        },
      ],
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      // Mid-morning on a weekday so the 00:00-23:59 window is deterministically open.
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-10-21T10:00:00Z'));
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(workspace);
      (prisma.aiSummary.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.standupEntry.findMany as jest.Mock).mockResolvedValue([
        {
          userId: 'u-on-time',
          status: 'SUBMITTED',
          submittedAt: new Date(),
          blockerText: null,
          blockerFlag: null,
        },
        {
          userId: 'u-late',
          status: 'LATE',
          submittedAt: new Date(),
          blockerText: 'waiting on API keys',
          blockerFlag: { id: 'bf-1', severity: 'MEDIUM', isResolved: false },
        },
      ]);
    });

    it('keeps LATE distinct from SUBMITTED', async () => {
      const state = await service.getDashboardState('ws-1');
      const byId = Object.fromEntries(state.members.map((m) => [m.id, m]));
      expect(byId['u-on-time'].status).toBe('submitted');
      expect(byId['u-late'].status).toBe('late');
      expect(byId['u-pending'].status).toBe('not_yet');
    });

    it('exposes the real blocker severity instead of assuming HIGH', async () => {
      const state = await service.getDashboardState('ws-1');
      const late = state.members.find((m) => m.id === 'u-late');
      expect(late?.blocker).toMatchObject({ severity: 'MEDIUM' });
    });

    it('scopes standup and summary queries to the requested workspace', async () => {
      await service.getDashboardState('ws-1');

      expect(prisma.standupEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workspaceId: 'ws-1' }),
        }),
      );

      expect(prisma.aiSummary.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspaceId_summaryDate: expect.objectContaining({
              workspaceId: 'ws-1',
            }),
          },
        }),
      );
    });
  });
});
