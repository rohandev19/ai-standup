import { BillingService } from './billing.service';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: jest.Mocked<PrismaService>;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    prisma = {
      workspace: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    } as any;
    service = new BillingService(prisma);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('handleWebhook', () => {
    it('should throw InternalServerErrorException in production when STRIPE_WEBHOOK_SECRET is unset', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await expect(
        service.handleWebhook('sig_test', Buffer.from('{}')),
      ).rejects.toThrow(
        new InternalServerErrorException(
          'Stripe webhook secret is not configured',
        ),
      );
    });

    it('should throw BadRequestException when signature verification fails', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      // Mock stripe.webhooks.constructEvent to throw
      (service as any).stripe = {
        webhooks: {
          constructEvent: jest.fn().mockImplementation(() => {
            throw new Error('Invalid signature');
          }),
        },
      };

      await expect(
        service.handleWebhook('sig_invalid', Buffer.from('{}')),
      ).rejects.toThrow(
        new BadRequestException('Webhook signature verification failed'),
      );
    });

    it('should update workspace to ENTERPRISE when checkout.session.completed event is verified', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              workspaceId: 'ws-123',
              tier: 'ENTERPRISE',
            },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };

      (service as any).stripe = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(mockEvent),
        },
      };

      (prisma.workspace.update as jest.Mock).mockResolvedValue({
        id: 'ws-123',
      });

      const result = await service.handleWebhook(
        'sig_valid',
        Buffer.from(JSON.stringify(mockEvent)),
      );

      expect(result).toEqual({ received: true });
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-123' },
        data: {
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          subscriptionTier: 'ENTERPRISE',
          subscriptionStatus: 'ACTIVE',
        },
      });
    });
  });
});
