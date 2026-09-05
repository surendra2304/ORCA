import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  async getIntegrations(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    
    // Attempt to sync first to ensure DB is up to date (or could be done via webhook)
    await this.integrationsService.syncConnections(workspaceId);

    const integrations = await this.integrationsService.getConnectedIntegrations(workspaceId);
    return { integrations };
  }

  @Post('connect')
  async initiateConnection(
    @Req() req: any,
    @Body() body: { provider: string; redirectUrl: string }
  ) {
    const workspaceId = req.user.workspaceId;
    return this.integrationsService.getIntegrationLink(
      workspaceId,
      body.provider,
      body.redirectUrl,
    );
  }
}
