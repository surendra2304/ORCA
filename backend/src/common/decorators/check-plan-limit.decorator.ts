import { SetMetadata } from '@nestjs/common';

export type LimitType = 'chatMessages' | 'voiceMinutes' | 'agents' | 'byonAllowed';

export const CHECK_PLAN_LIMIT_KEY = 'check_plan_limit';
export const CheckPlanLimit = (limitType: LimitType) => SetMetadata(CHECK_PLAN_LIMIT_KEY, limitType);
