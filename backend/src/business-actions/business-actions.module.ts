import { Module } from '@nestjs/common';
import { BusinessActionEngineService } from './business-action.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CrmModule } from '../crm/crm.module';
import { ActionTemplatesModule } from '../action-templates/action-templates.module';

@Module({
  imports: [PrismaModule, CrmModule, ActionTemplatesModule],
  providers: [BusinessActionEngineService],
  exports: [BusinessActionEngineService],
})
export class BusinessActionsModule {}
