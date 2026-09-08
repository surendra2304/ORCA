import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';

@Controller('leads')
@UseGuards(WorkspaceGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  async getLeads(
    @CurrentWorkspace() workspaceId: string,
    @Query('score') score?: string,
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.leadService.findMany(workspaceId, { score, status, agentId });
  }

  @Get('export')
  async exportLeads(
    @CurrentWorkspace() workspaceId: string,
    @Res() res: any,
  ) {
    const csvContent = await this.leadService.generateCsvString(workspaceId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.status(200).send(csvContent);
  }

  @Get(':id')
  async getLead(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.leadService.findOne(workspaceId, id);
  }

  @Patch(':id')
  async updateLeadStatus(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.leadService.updateStatus(workspaceId, id, status);
  }
}
