import { Module } from '@nestjs/common';
import { VapiController } from './vapi.controller';
import { VapiService } from './vapi.service';
import { KbModule } from '../kb/kb.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [PrismaModule, KbModule, BillingModule, LlmModule],
  controllers: [VapiController],
  providers: [VapiService],
})
export class VapiModule {}
