import { Test, TestingModule } from '@nestjs/testing';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { HttpException } from '@nestjs/common';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';

describe('SummariesController', () => {
  let controller: SummariesController;
  let summariesService: SummariesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SummariesController],
      providers: [
        {
          provide: SummariesService,
          useValue: {
            getSummaries: jest.fn(),
            dispatchDailySummaryJob: jest.fn(),
            dispatchWeeklyDigestJob: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(WorkspaceMembershipGuard)
      .useValue({ canActivate: () => true }) // Bypass guard check for unit testing controller logic
      .compile();

    controller = module.get<SummariesController>(SummariesController);
    summariesService = module.get<SummariesService>(SummariesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getSummaries', () => {
    it('should call getSummaries on the service with proper params', async () => {
      const mockSummaries = [{ id: 'sum-1' }];
      jest
        .spyOn(summariesService, 'getSummaries')
        .mockResolvedValue(mockSummaries as any);

      const result = await controller.getSummaries('ws-1', 'DAILY');

      expect(summariesService.getSummaries).toHaveBeenCalledWith(
        'ws-1',
        'DAILY',
      );
      expect(result).toEqual(mockSummaries);
    });

    it('should work without providing a type query', async () => {
      await controller.getSummaries('ws-1');
      expect(summariesService.getSummaries).toHaveBeenCalledWith(
        'ws-1',
        undefined,
      );
    });
  });

  describe('triggerDailySummary', () => {
    it('should successfully dispatch job if under rate limit', async () => {
      jest
        .spyOn(summariesService, 'dispatchDailySummaryJob')
        .mockResolvedValue(true as any);

      const result = await controller.triggerDailySummary('ws-1');

      expect(summariesService.dispatchDailySummaryJob).toHaveBeenCalledWith(
        'ws-1',
        expect.any(Date),
      );
      expect(result).toBe(true);
    });

    it('should throw HttpException if triggered twice within 1 minute (Rate Limit)', async () => {
      // First request (success)
      await controller.triggerDailySummary('ws-rate-limit');

      // Second request immediately (should fail)
      await expect(
        controller.triggerDailySummary('ws-rate-limit'),
      ).rejects.toThrow(HttpException);
      await expect(
        controller.triggerDailySummary('ws-rate-limit'),
      ).rejects.toThrow('Rate limit exceeded');

      // Ensure the service was only called once
      expect(summariesService.dispatchDailySummaryJob).toHaveBeenCalledTimes(1);
    });

    it('should allow another request after the rate limit expires', async () => {
      const now = Date.now();

      // Request 1 at T=0
      jest.spyOn(Date, 'now').mockReturnValue(now);
      await controller.triggerDailySummary('ws-expire');

      // Request 2 at T=30s (should fail)
      jest.spyOn(Date, 'now').mockReturnValue(now + 30 * 1000);
      await expect(controller.triggerDailySummary('ws-expire')).rejects.toThrow(
        HttpException,
      );

      // Request 3 at T=61s (should succeed, > 60s)
      jest.spyOn(Date, 'now').mockReturnValue(now + 61 * 1000);
      await controller.triggerDailySummary('ws-expire');

      expect(summariesService.dispatchDailySummaryJob).toHaveBeenCalledTimes(2);
    });

    it('rate limits should be isolated per workspace', async () => {
      await controller.triggerDailySummary('ws-A');

      // Immediate request for different workspace should succeed
      await controller.triggerDailySummary('ws-B');

      expect(summariesService.dispatchDailySummaryJob).toHaveBeenCalledTimes(2);
    });
  });

  describe('triggerWeeklyDigest', () => {
    it('should successfully dispatch weekly digest job if under rate limit', async () => {
      jest
        .spyOn(summariesService, 'dispatchWeeklyDigestJob')
        .mockResolvedValue(true as any);

      const result = await controller.triggerWeeklyDigest('ws-2');

      expect(summariesService.dispatchWeeklyDigestJob).toHaveBeenCalledWith(
        'ws-2',
        expect.any(Date),
      );
      expect(result).toBe(true);
    });

    it('should enforce a separate 1 hour rate limit for weekly digests', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // First weekly request (success)
      await controller.triggerWeeklyDigest('ws-weekly');

      // Daily request on same workspace should still succeed (different key)
      await controller.triggerDailySummary('ws-weekly');

      // Second weekly request at T=30mins (should fail)
      jest.spyOn(Date, 'now').mockReturnValue(now + 30 * 60 * 1000);
      await expect(controller.triggerWeeklyDigest('ws-weekly')).rejects.toThrow(
        HttpException,
      );

      // Third weekly request at T=61mins (should succeed, > 1 hour)
      jest.spyOn(Date, 'now').mockReturnValue(now + 61 * 60 * 1000);
      await controller.triggerWeeklyDigest('ws-weekly');

      expect(summariesService.dispatchWeeklyDigestJob).toHaveBeenCalledTimes(2);
      expect(summariesService.dispatchDailySummaryJob).toHaveBeenCalledTimes(1);
    });
  });
});
