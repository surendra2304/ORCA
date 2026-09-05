import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('BillingController', () => {
  let controller: BillingController;
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        {
          provide: BillingService,
          useValue: {
            getUsage: jest.fn().mockResolvedValue({ usage: 'test' }),
            createCheckoutSession: jest.fn().mockResolvedValue({ url: 'http://stripe.com' }),
            createPortalSession: jest.fn().mockResolvedValue({ url: 'http://stripe.com/portal' }),
            applyMockCheckout: jest.fn().mockResolvedValue({ success: true }),
            handleStripeWebhook: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<BillingController>(BillingController);
    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get usage', async () => {
    const res = await controller.getUsage('ws_123');
    expect(res).toEqual({ usage: 'test' });
    expect(service.getUsage).toHaveBeenCalledWith('ws_123');
  });

  it('should create checkout session', async () => {
    const res = await controller.createCheckoutSession('ws_123', {
      plan: 'growth',
      successUrl: 'http://success',
      cancelUrl: 'http://cancel',
    });
    expect(res).toEqual({ url: 'http://stripe.com' });
    expect(service.createCheckoutSession).toHaveBeenCalledWith('ws_123', 'growth', 'http://success', 'http://cancel');
  });

  it('should create portal session', async () => {
    const res = await controller.createPortalSession('ws_123', {
      returnUrl: 'http://return',
    });
    expect(res).toEqual({ url: 'http://stripe.com/portal' });
    expect(service.createPortalSession).toHaveBeenCalledWith('ws_123', 'http://return');
  });

  it('should apply mock checkout', async () => {
    const res = await controller.applyMockCheckout('ws_123', { plan: 'growth' });
    expect(res).toEqual({ success: true });
    expect(service.applyMockCheckout).toHaveBeenCalledWith('ws_123', 'growth');
  });
});
