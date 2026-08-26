import { Test, TestingModule } from '@nestjs/testing';
import { SummariesService } from './summaries.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('SummariesService', () => {
  let service: SummariesService;
  let prismaService: PrismaService;
  let aiService: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummariesService,
        {
          provide: PrismaService,
          useValue: {
            standupEntry: { findMany: jest.fn() },
            aiSummary: { upsert: jest.fn() },
            weeklyDigest: { upsert: jest.fn() },
            workspaceMember: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: AiService,
          useValue: {
            generateDailySummary: jest.fn(),
            generateWeeklyDigest: jest.fn(),
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
        {
          provide: getQueueToken('ai-summary'),
          useValue: { add: jest.fn() },
        },
        {
          provide: getQueueToken('ai-weekly-digest'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SummariesService>(SummariesService);
    prismaService = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
  });

  describe('generateDailySummary', () => {
    it('skips AI call when there are 0 entries', async () => {
      jest.spyOn(prismaService.standupEntry, 'findMany').mockResolvedValue([]);
      const aiSpy = jest.spyOn(aiService, 'generateDailySummary');

      const result = await service.generateDailySummary('ws-1', new Date());

      expect(aiSpy).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('uses upsert to overwrite existing daily summary on regeneration', async () => {
      jest.spyOn(prismaService.standupEntry, 'findMany').mockResolvedValue([
        {
          id: '1',
          yesterdayText: 'A',
          todayText: 'B',
          blockerText: 'C',
          user: { name: 'User 1' },
        } as any,
      ]);
      jest
        .spyOn(aiService, 'generateDailySummary')
        .mockResolvedValue('Mocked summary content');

      const upsertSpy = jest
        .spyOn(prismaService.aiSummary, 'upsert')
        .mockResolvedValue({ id: 'summary-1' } as any);

      await service.generateDailySummary('ws-1', new Date());

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          update: expect.any(Object),
          create: expect.any(Object),
        }),
      );
    });
  });
});
