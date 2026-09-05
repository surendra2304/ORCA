import { Module, Global } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Global()
@Module({
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
