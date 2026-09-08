import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IActionHandler, WorkflowContext } from '../action-handler.interface';
import { EmployeeAction } from '@prisma/client';
import { ActionRegistryService } from '../action-registry.service';
import { ZohoCrmAdapter } from '../../crm/adapters/zoho.adapter';

@Injectable()
export class ZohoCreateLeadHandler implements IActionHandler, OnModuleInit {
  readonly actionType = 'ZOHO_CREATE_LEAD';
  private readonly logger = new Logger(ZohoCreateLeadHandler.name);

  constructor(
    private readonly registry: ActionRegistryService,
    private readonly zohoAdapter: ZohoCrmAdapter,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async execute(employeeAction: EmployeeAction, context: WorkflowContext): Promise<any> {
    this.logger.debug(`Executing ZohoCreateLeadHandler for agent ${context.agentId}`);
    
    // The payload mapping and formatting is already handled efficiently in the zohoAdapter.
    // So we decouple the mapping logic by letting the CRM adapter handle its specific data formats.
    const lead = context.payload;

    if (!lead || !lead.id) {
        throw new Error('ZohoCreateLeadHandler requires a valid Lead payload');
    }

    if (lead.crmRecordId) { await this.zohoAdapter.updateLead(context.workspaceId, lead.crmRecordId, lead); return lead.crmRecordId; }

    const remoteRecordId = await this.zohoAdapter.createLead(context.workspaceId, lead);
    
    return remoteRecordId;
  }
}
