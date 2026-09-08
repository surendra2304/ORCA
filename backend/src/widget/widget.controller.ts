import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { WidgetService } from './widget.service';
import { PublicKeyGuard } from '../common/guards/public-key.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';

@Controller()
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Get('public/widget/config')
  @Public()
  @UseGuards(PublicKeyGuard)
  async getConfig(
    @CurrentWorkspace() workspaceId: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.widgetService.getConfig(workspaceId, agentId);
  }

  @Post('public/widget/ping')
  @Public()
  @UseGuards(PublicKeyGuard)
  async ping(@CurrentWorkspace() workspaceId: string) {
    return this.widgetService.ping(workspaceId);
  }

  @Post('widget/verify')
  @UseGuards(WorkspaceGuard)
  async verify(@CurrentWorkspace() workspaceId: string) {
    return this.widgetService.verify(workspaceId);
  }
}
