import { Module } from '@nestjs/common';
import { ActionRegistryService } from './action-registry.service';
import { ZohoCreateLeadHandler } from './handlers/zoho-create-lead.handler';
import { GmailWelcomeHandler } from './handlers/gmail-welcome.handler';
import { CrmModule } from '../crm/crm.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [CrmModule, PrismaModule],
  providers: [
    ActionRegistryService,
    ZohoCreateLeadHandler,
    GmailWelcomeHandler,
  ],
  exports: [ActionRegistryService],
})
export class ActionTemplatesModule {}
