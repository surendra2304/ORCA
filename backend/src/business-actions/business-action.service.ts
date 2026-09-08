import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ActionRegistryService } from '../action-templates/action-registry.service';

@Injectable()
export class BusinessActionEngineService {
  private readonly logger = new Logger(BusinessActionEngineService.name);

  constructor(
    private prisma: PrismaService,
    private actionRegistry: ActionRegistryService,
  ) {}

  /**
   * Orchestrates arbitrary workflows based on agent configuration and triggered events.
   */
  async executeWorkflow(workspaceId: string, agentId: string, eventType: string, payload: any): Promise<void> {
    const log = (msg: string) => {
       this.logger.debug(msg);
    };

    try {
      log(`Evaluating workflows for event: ${eventType} (Agent: ${agentId})`);

      // 1. Fetch active templates (EmployeeActions) assigned to this agent
      // We look up all active employee actions linked to this agent.
      let employeeActions: any[] = [];
      
      if (agentId) {
        employeeActions = await this.prisma.employeeAction.findMany({
          where: {
            agentId,
            enabled: true,
          },
          include: {
            integration: true,
          },
        });
      }

      if (!employeeActions || employeeActions.length === 0) {
        log(`No active templates configured for agent ${agentId}. Skipping workflow execution.`);
        return;
      }

      log(`Found ${employeeActions.length} actions to process.`);

      // 2. Iterate through each configured template/action for the agent
      for (const action of employeeActions) {
        
        // The trigger should only activate when the specific template is assigned and matches the event.
        // We check the template's configuration for a 'triggerEvent'. 
        // For existing Zoho templates that might not have this config yet, it defaults to 'LEAD_CAPTURED'.
        const config = (action.configuration as Record<string, any>) || {};
        const expectedTrigger = config.triggerEvent || (action.actionType === 'ZOHO_CREATE_LEAD' ? 'LEAD_CAPTURED' : null);

        if (expectedTrigger && expectedTrigger !== eventType) {
          log(`Skipping action ${action.actionType} because expectedTrigger ${expectedTrigger} !== ${eventType}`);
          continue; // Skip this template as it doesn't match the current event trigger
        }

        // Optional check for missing integration
        if (!action.integration || action.integration.status !== 'connected') {
           log(`Action ${action.actionType} is missing a connected integration.`);
           continue;
        }

        // 3. Resolve the action handler dynamically via the registry
        const handler = this.actionRegistry.getHandler(action.actionType);
        
        if (!handler) {
          log(`No handler registered for action type: ${action.actionType}`);
          continue;
        }

        log(`Executing handler for ${action.actionType}`);

        try {
          // 4. Execute the handler
          const context = {
            workspaceId,
            agentId,
            eventType,
            payload,
            integration: action.integration
          };

          const remoteRecordId = await handler.execute(action, context);
          log(`Handler executed successfully. Remote ID: ${remoteRecordId}`);

          // 5. Track success (if this was a lead capture action, we can log to LeadIntegrationSync)
          if (payload && payload.id) {
             const syncRecordId = await this.getOrCreateSyncRecord(payload.id, action.integration.id);
             await this.markSyncSuccess(syncRecordId, remoteRecordId, payload.id);
             log(`Marked sync success for lead ${payload.id}`);
          }

        } catch (error: any) {
          // 6. Track failure
          log(`Failed to execute action ${action.actionType} for agent ${agentId}: ${error.message}`);
          if (payload && payload.id) {
             const syncRecordId = await this.getOrCreateSyncRecord(payload.id, action.integration.id);
             await this.markSyncFailure(syncRecordId, error);
             log(`Marked sync failure for lead ${payload.id}`);
          }
        }
      }
    } catch (e: any) {
      log(`Error in business action engine: ${e.message}`);
    }
  }

  // --- Helper Methods for Tracking Integration Status ---

  private async getOrCreateSyncRecord(leadId: string, integrationId: string): Promise<string> {
      const syncRecord = await this.prisma.leadIntegrationSync.upsert({
        where: {
          leadId_integrationId: {
            leadId,
            integrationId,
          },
        },
        update: { status: 'pending', error: null },
        create: {
          leadId,
          integrationId,
          status: 'pending',
        },
      });
      return syncRecord.id;
  }

  private async markSyncSuccess(syncId: string, externalRecordId: string | null, leadId: string) {
      await this.prisma.leadIntegrationSync.update({
        where: { id: syncId },
        data: {
          status: 'success',
          externalRecordId: externalRecordId,
          syncedAt: new Date(),
        },
      });

      if (externalRecordId) {
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { crmRecordId: externalRecordId }
        });
      }
  }

  private async markSyncFailure(syncId: string, error: any) {
      await this.prisma.leadIntegrationSync.update({
        where: { id: syncId },
        data: {
          status: 'failed',
          error: error.message || 'Unknown error',
        },
      });
  }
}
