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
});
