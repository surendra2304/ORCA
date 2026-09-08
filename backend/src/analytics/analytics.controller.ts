import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';

@Controller('analytics')
@UseGuards(WorkspaceGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(
    @CurrentWorkspace() workspaceId: string,
    @Query('range') range?: string,
  ) {
    return this.analyticsService.getAnalytics(workspaceId, range);
  }
}
