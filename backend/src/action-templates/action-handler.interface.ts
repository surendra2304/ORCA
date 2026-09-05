import { EmployeeAction, Integration } from '@prisma/client';

export interface WorkflowContext {
  workspaceId: string;
  agentId: string;
  eventType: string;
  payload: any;
  integration?: Integration;
}

export interface IActionHandler {
  /**
   * Identifies the action type this handler resolves (e.g., 'ZOHO_CREATE_LEAD')
   */
  readonly actionType: string;

  /**
   * Executes the action using the provided context and the specific employee action configuration.
   * @param employeeAction The DB record containing template config
   * @param context The payload and event details
   */
  execute(employeeAction: EmployeeAction, context: WorkflowContext): Promise<any>;
}
