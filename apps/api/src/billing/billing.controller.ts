import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  Body,
  RawBodyRequest,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import type { Request } from 'express';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
  @Roles('OWNER')
  @Post('workspaces/:workspaceId/checkout')
  async createCheckoutSession(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body('tier') tier: 'PRO' | 'ENTERPRISE',
  ) {
    return this.billingService.createCheckoutSession(
      workspaceId,
      req.user.id,
      tier,
    );
  }

  // Webhook needs raw body for signature verification
  // Assuming NestJS is configured with `{ rawBody: true }` in main.ts
  @Post('webhook')
  async handleWebhook(@Req() req: any) {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.rawBody;

    if (!signature || !rawBody) {
      throw new Error('Missing stripe signature or raw body');
    }

    return this.billingService.handleWebhook(signature, rawBody);
  }
}
