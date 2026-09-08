import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';

@Controller('dashboard')
@UseGuards(WorkspaceGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getMetrics(
    @CurrentWorkspace() workspaceId: string,
    @Query('range') range?: string,
  ) {
    return this.dashboardService.getMetrics(workspaceId, range);
  }
}
