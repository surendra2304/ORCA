import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from '../../billing/billing.service';
import { CHECK_PLAN_LIMIT_KEY, LimitType } from '../decorators/check-plan-limit.decorator';

@Injectable()
export class PlanGateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.getAllAndOverride<LimitType>(CHECK_PLAN_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!limitType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.workspaceId || request.user?.workspaceId;

    if (!workspaceId) {
      return true;
    }

    const exceeded = await this.billingService.isLimitExceeded(workspaceId, limitType);
    if (exceeded) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Plan limit exceeded for ${limitType}. Assistant is paused.`,
          error: 'Payment Required',
          limitType,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
