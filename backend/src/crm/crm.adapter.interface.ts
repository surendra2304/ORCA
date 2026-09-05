import { Lead } from '@prisma/client';

export interface CrmLeadData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  description?: string;
}

export interface ICrmAdapter {
  /**
   * Creates a lead in the CRM and returns the remote record ID.
   */
  createLead(workspaceId: string, lead: Lead): Promise<string>;

  /**
   * Updates an existing lead in the CRM.
   */
  updateLead(workspaceId: string, remoteRecordId: string, lead: Lead): Promise<void>;
}
