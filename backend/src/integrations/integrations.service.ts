import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Composio } from '@composio/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IntegrationsService {
  private composio: Composio;
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('COMPOSIO_API_KEY');
    if (!apiKey) {
      this.logger.warn('COMPOSIO_API_KEY is not set. Integrations will not work.');
    }
    this.composio = new Composio({ apiKey: apiKey || 'missing_key' });
  }

  async getIntegrationLink(workspaceId: string, provider: string, redirectUrl: string) {
    try {
      // Composio uses specific app names, e.g., 'zohocrm' or 'zoho'
      const composioProvider = provider === 'zohocrm' ? 'zoho' : provider;
      
      // Fetch the exact authConfigId for the provider
      const authConfigs = await this.composio.authConfigs.list({ toolkit: composioProvider });
      if (!authConfigs.items || authConfigs.items.length === 0) {
        throw new Error(`Auth config not found for ${composioProvider}. Please enable it in the Composio dashboard.`);
      }
      const authConfigId = authConfigs.items[0].id;

      // Use the .link() method with the authConfigId
      const connection = await this.composio.connectedAccounts.link(
        workspaceId,
        authConfigId,
        { callbackUrl: redirectUrl }
      );

      return {
        redirectUrl: connection.redirectUrl,
      };
    } catch (error: any) {
      require('fs').writeFileSync('composio-error.txt', JSON.stringify(error, null, 2) + '\n\n' + error.stack);
      this.logger.error(`Failed to generate connection link for ${provider}`, error);
      throw new InternalServerErrorException(
        `Failed to generate connection link for ${provider}. Please check logs.`
      );
    }
  }

  async getConnectedIntegrations(workspaceId: string) {
    return this.prisma.integration.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncConnections(workspaceId: string) {
    try {
      const { items: connections } = await this.composio.connectedAccounts.list({ userIds: [workspaceId] });
      
      for (const conn of connections) {
        if (conn.status === 'ACTIVE') {
          const provider = conn.toolkit?.slug || 'unknown';
          
          // Find existing integration
          const existing = await this.prisma.integration.findFirst({
            where: {
              workspaceId,
              composioConnectedAccountId: conn.id,
            },
          });

          if (existing) {
            await this.prisma.integration.update({
              where: { id: existing.id },
              data: {
                status: 'connected',
                provider: provider,
                connectedAt: new Date(),
              }
            });
          } else {
            await this.prisma.integration.create({
              data: {
                workspaceId,
                composioConnectedAccountId: conn.id,
                provider: provider,
                status: 'connected',
                connectedAt: new Date(),
              }
            });
          }
        }
      }
    } catch (e: any) {
      this.logger.error(`Failed to sync connections for workspace ${workspaceId}`, e);
    }
  }
}
