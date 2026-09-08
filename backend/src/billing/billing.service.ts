import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
type SubscriptionPlan = 'starter' | 'growth' | 'agency';
import Stripe from 'stripe';

export interface PlanLimits {
  chatMessages: number;
  voiceMinutes: number;
  agents: number;
  byonAllowed: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: {
    chatMessages: 500,
    voiceMinutes: 100,
    agents: 2, // 1 chat agent + 1 voice agent
    byonAllowed: false,
  },
  growth: {
    chatMessages: 5000,
    voiceMinutes: 1000,
    agents: 6, // 3 chat + 3 voice
    byonAllowed: true,
  },
  enterprise: {
    chatMessages: Infinity,
    voiceMinutes: Infinity,
    agents: Infinity,
    byonAllowed: true,
  },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey && stripeKey !== 'local_placeholder') {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-02-11' as any,
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY is not configured. Falling back to local mock payment handlers.');
    }
  }

  async getBillingCycleStart(workspaceId: string): Promise<Date> {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });
    if (sub && sub.currentPeriodEnd) {
      const start = new Date(sub.currentPeriodEnd);
      start.setMonth(start.getMonth() - 1);
      return start;
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo;
  }

  async getPlan(workspaceId: string): Promise<string> {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });
    if (sub && sub.status === 'active') {
      return sub.plan;
    }
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });
    return ws?.plan || 'starter';
  }

  async getUsage(workspaceId: string) {
    const cycleStart = await this.getBillingCycleStart(workspaceId);
    const plan = await this.getPlan(workspaceId);
    
    // Group and sum usage events
    const events = await this.prisma.usageEvent.groupBy({
      by: ['type'],
      where: {
        workspaceId,
        createdAt: { gte: cycleStart },
      },
      _sum: {
        quantity: true,
      },
    });

    const usage = {
      chatMessages: 0,
      voiceMinutes: 0,
      agents: 0,
    };

    for (const event of events) {
      const sum = event._sum.quantity || 0;
      if (event.type === 'chat_message') {
        usage.chatMessages = sum;
      } else if (event.type === 'voice_minute_web' || event.type === 'voice_minute_phone') {
        usage.voiceMinutes += sum;
      }
    }

    const agentCount = await this.prisma.agent.count({
      where: { workspaceId },
    });
    usage.agents = agentCount;

    return {
      plan,
      usage,
      limits: PLAN_LIMITS[plan] || PLAN_LIMITS.starter,
      cycleStart: cycleStart.toISOString(),
    };
  }

  async recordUsageEvent(workspaceId: string, type: string, quantity = 1, agentId?: string) {
    return this.prisma.usageEvent.create({
      data: {
        workspaceId,
        type,
        quantity,
        agentId,
      },
    });
  }

  async isLimitExceeded(
    workspaceId: string,
    type: 'chatMessages' | 'voiceMinutes' | 'agents' | 'byonAllowed',
  ): Promise<boolean> {
    const plan = await this.getPlan(workspaceId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

    if (type === 'byonAllowed') {
      return !limits.byonAllowed;
    }

    const current = await this.getUsage(workspaceId);
    const limitVal = limits[type];
    const usageVal = current.usage[type];

    return usageVal >= limitVal;
  }

  async createCheckoutSession(workspaceId: string, plan: string, successUrl: string, cancelUrl: string) {
    if (!this.stripe) {
      this.logger.log(`Stripe is in mock mode. Auto-navigating mock checkout for plan: ${plan}`);
      // Return a mock checkout URL that points back to our dashboard or settings page
      return {
        url: `${successUrl}?mock_session=true&plan=${plan}`,
        isMock: true,
      };
    }

    const priceId = this.getPriceIdForPlan(plan);
    if (!priceId) {
      throw new BadRequestException(`No active price configured for plan: ${plan}`);
    }

    // Try to find existing Stripe Customer ID
    let sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });

    let customerId = sub?.stripeCustomerId;
    if (!customerId) {
      const workspace = await this.prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
      });
      const customer = await this.stripe.customers.create({
        name: workspace.name,
        metadata: { workspaceId },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { workspaceId },
      },
    });

    return { url: session.url, isMock: false };
  }

  async createPortalSession(workspaceId: string, returnUrl: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });

    if (!sub || !sub.stripeCustomerId) {
      throw new BadRequestException('No billing account found. Please subscribe first.');
    }

    if (!this.stripe) {
      // Mock portal
      return {
        url: returnUrl,
        isMock: true,
      };
    }

    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url, isMock: false };
  }

  async handleStripeWebhook(payload: string, signature: string) {
    if (!this.stripe) return;

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret || '');
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Processing Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const workspaceId = session.subscription_data?.metadata?.workspaceId || session.metadata?.workspaceId;
        const stripeCustomerId = session.customer as string;
        const stripeSubId = session.subscription as string;

        if (workspaceId) {
          const subscriptionDetails = (await this.stripe.subscriptions.retrieve(stripeSubId)) as any;
          const plan = this.getPlanFromPriceId(subscriptionDetails.items.data[0].price.id) as SubscriptionPlan;
          
          await this.prisma.subscription.upsert({
            where: { workspaceId },
            update: {
              stripeSubId,
              stripeCustomerId,
              plan,
              status: 'active',
              currentPeriodEnd: new Date(subscriptionDetails.current_period_end * 1000),
              cancelAtPeriodEnd: subscriptionDetails.cancel_at_period_end,
            },
            create: {
              workspaceId,
              stripeCustomerId,
              stripeSubId,
              plan,
              status: 'active',
              currentPeriodEnd: new Date(subscriptionDetails.current_period_end * 1000),
              cancelAtPeriodEnd: subscriptionDetails.cancel_at_period_end,
            },
          });

          await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { plan },
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const workspaceId = subscription.metadata.workspaceId;
        
        if (workspaceId) {
          const plan = this.getPlanFromPriceId(subscription.items.data[0].price.id) as SubscriptionPlan;
          
          await this.prisma.subscription.update({
            where: { workspaceId },
            data: {
              plan,
              status: subscription.status === 'active' ? 'active' : 'canceled',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });

          await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { plan },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const workspaceId = subscription.metadata.workspaceId;

        if (workspaceId) {
          await this.prisma.subscription.update({
            where: { workspaceId },
            data: {
              plan: 'starter' as SubscriptionPlan,
              status: 'canceled',
            },
          });

          await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { plan: 'starter' as SubscriptionPlan },
          });
        }
        break;
      }
    }
  }

  // Developer local bypass trigger
  async applyMockCheckout(workspaceId: string, plan: string) {
    if (!['starter', 'growth', 'enterprise', 'agency'].includes(plan)) {
      throw new BadRequestException('Invalid plan name.');
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    await this.prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        stripeSubId: 'mock_sub_123',
        stripeCustomerId: 'mock_customer_123',
        plan: plan as SubscriptionPlan,
        status: 'active',
        currentPeriodEnd: thirtyDaysFromNow,
        cancelAtPeriodEnd: false,
      },
      create: {
        workspaceId,
        stripeCustomerId: 'mock_customer_123',
        stripeSubId: 'mock_sub_123',
        plan: plan as SubscriptionPlan,
        status: 'active',
        currentPeriodEnd: thirtyDaysFromNow,
        cancelAtPeriodEnd: false,
      },
    });

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { plan: plan as SubscriptionPlan },
    });

    return { success: true, plan };
  }

  private getPriceIdForPlan(plan: string): string | null {
    if (plan === 'growth') {
      return this.configService.get<string>('STRIPE_PRICE_GROWTH') || 'price_growth_mock';
    }
    if (plan === 'enterprise') {
      return this.configService.get<string>('STRIPE_PRICE_ENTERPRISE') || 'price_enterprise_mock';
    }
    return null;
  }

  private getPlanFromPriceId(priceId: string): string {
    const growthPrice = this.configService.get<string>('STRIPE_PRICE_GROWTH') || 'price_growth_mock';
    const enterprisePrice = this.configService.get<string>('STRIPE_PRICE_ENTERPRISE') || 'price_enterprise_mock';

    if (priceId === growthPrice) return 'growth';
    if (priceId === enterprisePrice) return 'enterprise';
    return 'starter';
  }
}
