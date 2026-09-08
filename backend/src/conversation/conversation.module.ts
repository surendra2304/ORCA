import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessActionsModule } from '../business-actions/business-actions.module';
import { LlmModule } from '../llm/llm.module';
import { KbModule } from '../kb/kb.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { BillingModule } from '../billing/billing.module';
import { AppCacheModule } from '../common/cache/cache.module';

@Module({
  imports: [PrismaModule, LlmModule, KbModule, DashboardModule, BusinessActionsModule, BillingModule, AppCacheModule],
  providers: [ConversationService],
  controllers: [ConversationController],
  exports: [ConversationService],
})
export class ConversationModule {}
