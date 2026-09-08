import { PlanGateGuard } from './plan-gate.guard';
import { Reflector } from '@nestjs/core';
import { BillingService } from '../../billing/billing.service';

describe('PlanGateGuard', () => {
  let guard: PlanGateGuard;
  let reflector: Reflector;
  let billingService: BillingService;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    billingService = {
      isLimitExceeded: jest.fn(),
    } as any;
    guard = new PlanGateGuard(reflector, billingService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should pass if no limit type is defined', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should pass if limit is not exceeded', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('chatMessages');
    jest.spyOn(billingService, 'isLimitExceeded').mockResolvedValue(false);
    const request = { workspaceId: 'ws_123' };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw HttpException if limit is exceeded', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('chatMessages');
    jest.spyOn(billingService, 'isLimitExceeded').mockResolvedValue(true);
    const request = { workspaceId: 'ws_123' };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow();
  });
});
