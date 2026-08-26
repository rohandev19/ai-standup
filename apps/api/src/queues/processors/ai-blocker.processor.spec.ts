import { Test, TestingModule } from '@nestjs/testing';
import { AiBlockerProcessor } from './ai-blocker.processor';
import { AiService } from '../../ai/ai.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AiBlockerProcessor', () => {
  let processor: AiBlockerProcessor;
  let aiService: AiService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiBlockerProcessor,
        {
          provide: AiService,
          useValue: {
            extractBlockers: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            workspace: { findUnique: jest.fn() },
            standupEntry: { findMany: jest.fn(), findUnique: jest.fn() },
            aiBlockerInfo: { create: jest.fn() },
            blockerFlag: { create: jest.fn() },
            $transaction: jest.fn(async (cb) => {
              // Create a mock transaction object that has the methods the callback expects
              const tx = {
                blockerFlag: { create: jest.fn() },
                aiBlockerInfo: { create: jest.fn() },
                standupEntry: { update: jest.fn() },
              };
              return cb(tx);
            }),
          },
        },
        {
          provide: EventsGateway,
          useValue: { broadcastToWorkspace: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn() },
        },
        {
          provide: getQueueToken('email'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<AiBlockerProcessor>(AiBlockerProcessor);
    aiService = module.get<AiService>(AiService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('process', () => {
    it('stops after 3 attempts and applies graceful fallback', async () => {
      // Mock failure in AI extractBlockers
      jest
        .spyOn(aiService, 'extractBlockers')
        .mockRejectedValue(new Error('AI Failed'));

      jest
        .spyOn(prismaService.workspace, 'findUnique')
        .mockResolvedValue({ id: 'ws-1', name: 'WS' } as any);
      jest.spyOn(prismaService.standupEntry, 'findMany').mockResolvedValue([
        { id: '1', content: 'Did X' },
        { id: '2', content: 'Blocked by Y' },
      ] as any);

      const mockJob = {
        name: 'process-blocker',
        data: {
          standupId: 'se-1',
          blockerText: 'I am stuck',
          workspaceId: 'ws-1',
        },
        attemptsMade: 3, // Current attempt is 3
        opts: { attempts: 3 },
      } as any;

      // Because attemptsMade >= opts.attempts, it should trigger fallback
      await processor.process(mockJob);

      // The fallback should insert LOW severity blockers directly for all users with blockerText
      // Since it's inside a transaction, we check if $transaction was called
      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });
});
