import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Composio } from '@composio/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ComposioClientService {
  private toolSet: any;
  private readonly logger = new Logger(ComposioClientService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('COMPOSIO_API_KEY');
    if (apiKey) {
      this.toolSet = new Composio({ apiKey });
    } else {
      this.logger.warn('COMPOSIO_API_KEY is not set. Integrations will not work.');
      this.toolSet = new Composio({ apiKey: 'missing_key' });
    }
  }

  /**
   * Executes a specific action on behalf of an entity (workspace).
   */
  async executeAction(workspaceId: string, actionName: string, params: any): Promise<any> {
    try {
      this.logger.debug(`Executing Composio Action [${actionName}] for workspace ${workspaceId}`);
      
      // Note: The new @composio/core SDK requires a specific options object rather than passing arguments directly.
      // 1. `userId` MUST be used instead of `entityId` or `connectedAccountId` when mapping our local workspace to Composio's entity system. 
      //    Composio automatically resolves the exact connected account (e.g., ca_XXX) via the userId.
      // 2. `dangerouslySkipVersionCheck: true` is required to prevent "Toolkit version not specified" strictness errors that fail the sync.
      // 3. The actual payload data MUST be nested inside the `arguments` key, rather than flattened.
      const response = await this.toolSet.tools.execute(
        actionName,
        {
          userId: workspaceId,
          dangerouslySkipVersionCheck: true,
          arguments: params,
        }
      );
      
      return response;
    } catch (error: any) {
      this.logger.error(`Composio action ${actionName} failed for entity ${workspaceId}`, error);
      throw new InternalServerErrorException(
        `Failed to execute CRM action: ${error.message || 'Unknown Error'}`
      );
    }
  }
}
