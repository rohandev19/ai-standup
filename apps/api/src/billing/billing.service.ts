import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    // If you don't have STRIPE_SECRET_KEY, we'll initialize a dummy one for now.
    // In production, this will fail if the key is missing.
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2023-10-16' as any, // Using a compatible cast for the current stripe version
    });
  }

  async createCheckoutSession(
    workspaceId: string,
    userId: string,
    tier: 'PRO' | 'ENTERPRISE',
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { where: { userId } } },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    const priceId =
      tier === 'PRO'
        ? process.env.STRIPE_PRICE_ID_PRO || 'price_mock_pro'
        : process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_mock_enterprise';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: workspaceId,
      success_url: `${process.env.FRONTEND_URL}/dashboard/settings/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/settings/billing?canceled=true`,
      metadata: {
        workspaceId,
        tier,
      },
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string, body: Buffer) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new Error('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspaceId;
        const tier = session.metadata?.tier;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (workspaceId && tier) {
          await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscriptionTier: tier as 'PRO' | 'ENTERPRISE',
              subscriptionStatus: 'ACTIVE',
            },
          });
          this.logger.log(`Workspace ${workspaceId} upgraded to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const status = subscription.status; // active, past_due, canceled, etc.
        const subscriptionId = subscription.id;

        await this.prisma.workspace.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            subscriptionStatus: status.toUpperCase() as any, // ACTIVE, PAST_DUE, CANCELED
            ...(status === 'canceled' && { subscriptionTier: 'FREE' }),
          },
        });
        this.logger.log(
          `Subscription ${subscriptionId} status updated to ${status}`,
        );
        break;
      }
    }

    return { received: true };
  }
}
