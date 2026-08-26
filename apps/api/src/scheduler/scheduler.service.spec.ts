import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { DateTime } from 'luxon';
import { NotificationsService } from '../notifications/notifications.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let prisma: PrismaService;
  let aiSummaryQueue: any;
  let emailQueue: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: PrismaService,
          useValue: {
            workspace: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
            standupEntry: {
              findMany: jest.fn(),
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: getQueueToken('ai-summary'),
          useValue: { add: jest.fn() },
        },
        {
          provide: getQueueToken('ai-weekly-digest'),
          useValue: { add: jest.fn() },
        },
        {
          provide: getQueueToken('email'),
          useValue: { add: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendReminder: jest.fn(),
            createNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    prisma = module.get<PrismaService>(PrismaService);
    aiSummaryQueue = module.get(getQueueToken('ai-summary'));
    emailQueue = module.get(getQueueToken('email'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Window Close Processor', () => {
    it('should skip if not a working day', async () => {
      jest
        .spyOn(DateTime, 'now')
        .mockReturnValue(DateTime.fromISO('2026-08-23T10:00:00.000Z') as any); // Sunday
      (prisma.workspace.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ws-1',
          timezone: 'UTC',
          workingDays: [1, 2, 3, 4, 5], // Mon-Fri
          standupWindowEnd: '17:00',
          lastProcessedDate: null,
          members: [],
        },
      ]);

      await service.processWindowClose();
      expect(prisma.standupEntry.createMany).not.toHaveBeenCalled();
    });

    it('should process if window is closed and working day', async () => {
      // Mock time to be Friday 18:00 UTC (Window closed)
      jest
        .spyOn(DateTime, 'now')
        .mockReturnValue(DateTime.fromISO('2026-08-21T18:00:00.000Z') as any);

      (prisma.workspace.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ws-1',
          timezone: 'UTC',
          workingDays: [1, 2, 3, 4, 5], // Mon-Fri
          standupWindowEnd: '17:00',
          lastProcessedDate: null,
          members: [
            { userId: 'u1', isActive: true },
            { userId: 'u2', isActive: true },
          ],
        },
      ]);

      // u1 submitted, u2 didn't
      (prisma.standupEntry.findMany as jest.Mock).mockResolvedValue([
        { userId: 'u1' },
      ]);

      await service.processWindowClose();

      expect(prisma.standupEntry.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'u2', status: 'MISSED' }),
          ]),
        }),
      );
      expect(prisma.workspace.update).toHaveBeenCalled();
      expect(aiSummaryQueue.add).toHaveBeenCalledWith(
        'generate-daily-summary',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('Submission Reminder', () => {
    it('should send email reminder 30 mins before window closes', async () => {
      // Window closes 17:00. We are at 16:30.
      jest
        .spyOn(DateTime, 'now')
        .mockReturnValue(DateTime.fromISO('2026-08-21T16:30:00.000Z') as any);

      (prisma.workspace.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ws-1',
          name: 'WS1',
          timezone: 'UTC',
          workingDays: [1, 2, 3, 4, 5],
          standupWindowEnd: '17:00',
          members: [
            {
              userId: 'u1',
              isActive: true,
              isMuted: false,
              user: { email: 'u1@test.com', globalEmailPref: true },
            },
          ],
        },
      ]);

      (prisma.standupEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.sendSubmissionReminders();

      expect(emailQueue.add).toHaveBeenCalledWith('send-reminder', {
        email: 'u1@test.com',
        workspaceName: 'WS1',
        minutesRemaining: 30,
      });
    });
  });
});
