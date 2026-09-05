import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('agents')
@UseGuards(WorkspaceGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async getAgents(
    @CurrentWorkspace() workspaceId: string,
    @Query('kind') kind?: string,
  ) {
    return this.agentService.findMany(workspaceId, kind);
  }

  @Post()
  async createAgent(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { kind: string; name: string; [key: string]: any },
  ) {
    return this.agentService.create(workspaceId, body);
  }

  @Get(':id')
  async getAgent(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.agentService.findOne(workspaceId, id);
  }

  @Patch(':id')
  async updateAgent(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.agentService.update(workspaceId, id, body);
  }

  @Post(':id/publish')
  async publishAgent(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.userId;
    return this.agentService.publish(workspaceId, id, userId);
  }

  @Get(':id/versions')
  async getAgentVersions(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.agentService.getVersions(workspaceId, id);
  }

  @Post(':id/rollback')
  async rollbackAgent(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() body: { versionId: string },
  ) {
    return this.agentService.rollback(workspaceId, id, body.versionId);
  }

  @Delete(':id')
  async deleteAgent(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.agentService.delete(workspaceId, id);
  }

  @Post(':id/actions/toggle')
  async toggleAction(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() body: { integrationId: string; actionType: string; enabled: boolean; configuration?: any },
  ) {
    return this.agentService.toggleAction(
      workspaceId,
      id,
      body.integrationId,
      body.actionType,
      body.enabled,
      body.configuration,
    );
  }

  @Delete(':id/actions/:actionId')
  async removeAction(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
  ) {
    return this.agentService.removeAction(workspaceId, id, actionId);
  }
}
