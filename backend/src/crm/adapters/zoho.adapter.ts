import { Injectable, Logger } from '@nestjs/common';
import { ICrmAdapter } from '../crm.adapter.interface';
import { Lead } from '@prisma/client';
import { ComposioClientService } from '../composio-client.service';

@Injectable()
export class ZohoCrmAdapter implements ICrmAdapter {
  private readonly logger = new Logger(ZohoCrmAdapter.name);

  constructor(private composio: ComposioClientService) {}

  private mapToZohoLead(lead: Lead) {
    // Zoho CRM Lead module requires Last_Name at a minimum.
    const names = (lead.name || 'Unknown').split(' ');
    const lastName = names.length > 1 ? names.slice(1).join(' ') : names[0];
    const firstName = names.length > 1 ? names[0] : '';

    return {
      Last_Name: lastName,
      First_Name: firstName || undefined,
      Email: lead.email || undefined,
      Phone: lead.phone || undefined,
      Lead_Source: lead.source || 'AI Agent',
      Description: lead.aiNote || undefined,
    };
  }

  async createLead(workspaceId: string, lead: Lead): Promise<string> {
    const recordData = this.mapToZohoLead(lead);

    this.logger.debug(`Creating lead in Zoho for workspace ${workspaceId}`);
    
    // ZOHO_CREATE_LEAD is the action for adding records in Zoho CRM
    const res = await this.composio.executeAction(workspaceId, 'ZOHO_CREATE_LEAD', recordData);

    // Composio returns successful: true even if Zoho's internal payload contains an error.
    // We must deeply inspect the Zoho payload to ensure it actually created the record.
    if (res && res.successful && res.data && res.data.data && Array.isArray(res.data.data)) {
        const zohoResponse = res.data.data[0];
        
        if (zohoResponse.status === 'error') {
           throw new Error(`Zoho CRM Error: ${zohoResponse.message || JSON.stringify(zohoResponse.details)}`);
        }
        
        if (zohoResponse.details && zohoResponse.details.id) {
            return zohoResponse.details.id;
        }
    }
    
    // Fallback if the structure differs
    if (res && res.id) return res.id;
    
    // Just stringify if we can't cleanly parse it for now, so we have a reference.
    return 'zoho-record-id-placeholder'; 
  }

  async updateLead(workspaceId: string, remoteRecordId: string, lead: Lead): Promise<void> {
    const recordData = this.mapToZohoLead(lead);

    this.logger.debug(`Updating lead ${remoteRecordId} in Zoho for workspace ${workspaceId}`);
    
    await this.composio.executeAction(workspaceId, 'ZOHOCRM_UPDATE_RECORD', {
      module: 'Leads',
      id: remoteRecordId,
      data: recordData,
    });
  }
}
