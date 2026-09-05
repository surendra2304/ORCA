import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Request } from 'express';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('usage')
  @UseGuards(WorkspaceGuard)
  async getUsage(@CurrentWorkspace() workspaceId: string) {
    return this.billingService.getUsage(workspaceId);
  }

  @Post('checkout')
  @UseGuards(WorkspaceGuard)
  async createCheckoutSession(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { plan: string; successUrl: string; cancelUrl: string },
  ) {
    const { plan, successUrl, cancelUrl } = body;
    if (!plan) throw new BadRequestException('Plan parameter is required');
    return this.billingService.createCheckoutSession(workspaceId, plan, successUrl, cancelUrl);
  }

  @Post('portal')
  @UseGuards(WorkspaceGuard)
  async createPortalSession(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { returnUrl: string },
  ) {
    const { returnUrl } = body;
    if (!returnUrl) throw new BadRequestException('Return URL is required');
    return this.billingService.createPortalSession(workspaceId, returnUrl);
  }

  @Post('mock-checkout')
  @UseGuards(WorkspaceGuard)
  async applyMockCheckout(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { plan: string },
  ) {
    const { plan } = body;
    if (!plan) throw new BadRequestException('Plan parameter is required');
    return this.billingService.applyMockCheckout(workspaceId, plan);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    
    // Stripe SDK requires the raw body as a buffer or string for verification
    const rawBody = (req as any).rawBody || req.body;
    return this.billingService.handleStripeWebhook(rawBody, signature);
  }
}
