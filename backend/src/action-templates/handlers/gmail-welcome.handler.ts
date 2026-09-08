import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IActionHandler, WorkflowContext } from '../action-handler.interface';
import { ActionRegistryService } from '../action-registry.service';
import { EmployeeAction } from '@prisma/client';
import { ComposioClientService } from '../../crm/composio-client.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GmailWelcomeHandler implements IActionHandler, OnModuleInit {
  private readonly logger = new Logger(GmailWelcomeHandler.name);
  readonly actionType = 'GMAIL_SEND_WELCOME';

  constructor(
    private registry: ActionRegistryService,
    private composio: ComposioClientService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async execute(employeeAction: EmployeeAction, context: WorkflowContext): Promise<any> {
    this.logger.debug(`Executing GmailWelcomeHandler for agent ${context.agentId}`);
    
    const lead = context.payload;

    if (!lead || !lead.email) {
        throw new Error('GmailWelcomeHandler requires a Lead payload with a valid email address');
    }

    const template = await this.prisma.emailActionTemplate.findUnique({
      where: { employeeActionId: employeeAction.id }
    });
    
    // Fallback defaults if the user hasn't configured anything yet
    const config = employeeAction.configuration as Record<string, any> || {};
    const subjectTemplate = template?.subject || config.subject || 'Welcome to Kaligan, thanks for registering';
    const bodyTemplate = template?.body || config.body || 'Hi {Name},\n\nWelcome to Kaligan! We are thrilled to have you.';

    const leadName = lead.name || 'there';
    const subject = subjectTemplate.replace(/{Name}/g, leadName);
    const body = bodyTemplate.replace(/{Name}/g, leadName);

    this.logger.debug(`Sending welcome email via Gmail to ${lead.email}`);
    
    // Format the payload exactly as Composio expects for GMAIL_SEND_EMAIL
    // Based on standard Composio Gmail integration spec
    const emailPayload = {
      to: lead.email,
      subject: subject,
      body: body,
    };

    // Execute via Composio
    const res = await this.composio.executeAction(context.workspaceId, 'GMAIL_SEND_EMAIL', emailPayload);
    
    // Return a tracking/message ID if available
    return res.data?.id || res.id || 'sent';
  }
}
