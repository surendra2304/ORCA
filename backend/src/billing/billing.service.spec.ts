import { Test, TestingModule } from '@nestjs/testing';
import { BillingService, PLAN_LIMITS } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaService;
  let workspaceId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            subscription: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            workspace: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            usageEvent: {
              groupBy: jest.fn(),
              create: jest.fn(),
            },
            agent: {
              count: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'STRIPE_SECRET_KEY') return 'local_placeholder';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaService>(PrismaService);
    workspaceId = '550e8400-e29b-41d4-a716-446655440000';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlan', () => {
    it('should return starter by default when no subscription exists', async () => {
      jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.workspace, 'findUnique').mockResolvedValue({ plan: 'starter' } as any);

      const plan = await service.getPlan(workspaceId);
      expect(plan).toBe('starter');
    });

    it('should return subscription plan if subscription is active', async () => {
      jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue({
        plan: 'growth',
        status: 'active',
      } as any);

      const plan = await service.getPlan(workspaceId);
      expect(plan).toBe('growth');
    });
  });

  describe('getUsage', () => {
    it('should aggregate usage events and agent counts correctly', async () => {
      jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.workspace, 'findUnique').mockResolvedValue({ plan: 'starter' } as any);
      jest.spyOn(prisma.usageEvent, 'groupBy').mockResolvedValue([
        { type: 'chat_message', _sum: { quantity: 150 } },
        { type: 'voice_minute_web', _sum: { quantity: 20 } },
      ] as any);
      jest.spyOn(prisma.agent, 'count').mockResolvedValue(1);

      const res = await service.getUsage(workspaceId);
      expect(res.plan).toBe('starter');
      expect(res.usage.chatMessages).toBe(150);
      expect(res.usage.voiceMinutes).toBe(20);
      expect(res.usage.agents).toBe(1);
    });
  });

  describe('isLimitExceeded', () => {
    it('should return true if usage exceeds limit', async () => {
      jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.workspace, 'findUnique').mockResolvedValue({ plan: 'starter' } as any);
      jest.spyOn(prisma.usageEvent, 'groupBy').mockResolvedValue([
        { type: 'chat_message', _sum: { quantity: PLAN_LIMITS.starter.chatMessages + 10 } },
      ] as any);
      jest.spyOn(prisma.agent, 'count').mockResolvedValue(0);

      const exceeded = await service.isLimitExceeded(workspaceId, 'chatMessages');
      expect(exceeded).toBe(true);
    });

    it('should return false if usage is below limit', async () => {
      jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.workspace, 'findUnique').mockResolvedValue({ plan: 'starter' } as any);
      jest.spyOn(prisma.usageEvent, 'groupBy').mockResolvedValue([
        { type: 'chat_message', _sum: { quantity: 10 } },
      ] as any);
      jest.spyOn(prisma.agent, 'count').mockResolvedValue(0);

      const exceeded = await service.isLimitExceeded(workspaceId, 'chatMessages');
      expect(exceeded).toBe(false);
    });
  });

  describe('applyMockCheckout', () => {
    it('should upsert subscription and update workspace plan', async () => {
      jest.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any);
      jest.spyOn(prisma.workspace, 'update').mockResolvedValue({} as any);

      const res = await service.applyMockCheckout(workspaceId, 'growth');
      expect(res.success).toBe(true);
      expect(res.plan).toBe('growth');
      expect(prisma.subscription.upsert).toHaveBeenCalled();
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: workspaceId },
        data: { plan: 'growth' },
      });
    });
  });
});
