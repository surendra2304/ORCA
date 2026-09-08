import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, ValidateNested, ArrayMaxSize, IsObject, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';
import { OutboundService } from './outbound.service';
import type { Request } from 'express';

export class DialLeadDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsOptional() recipientName?: string;
  @IsString() @IsOptional() leadId?: string;
  @IsString() @IsOptional() customPrompt?: string;
  @IsString() @IsOptional() fromNumber?: string;
}

export class CampaignLeadDto {
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() leadId?: string;
  @IsObject() @IsOptional() customData?: Record<string, any>;
}

export class CreateCampaignDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() fromNumber?: string;
  @IsString() @IsOptional() customPrompt?: string;
  @IsString() @IsOptional() scheduledAt?: string;
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => CampaignLeadDto) leads: CampaignLeadDto[];
}

function getTrustedHost(reqHost: string): string {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/^https?:\/\//, '');
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/^https?:\/\//, '');
  return ['localhost:3005', '127.0.0.1:3005'].includes(reqHost) ? reqHost : 'localhost:3005';
}

@Controller('telephony/outbound')
@UseGuards(WorkspaceGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Post('dial')
  async dialLead(@CurrentWorkspace() workspaceId: string, @Body() body: DialLeadDto, @Req() req: Request) {
    return this.outboundService.dialSingleLead(workspaceId, { ...body, host: getTrustedHost(req.headers.host || '') });
  }

  @Post('campaigns')
  async createCampaign(@CurrentWorkspace() workspaceId: string, @Body() body: CreateCampaignDto, @Req() req: Request) {
    return this.outboundService.createCampaign(workspaceId, { ...body, host: getTrustedHost(req.headers.host || '') });
  }

  @Get('campaigns')
  async getCampaigns(@CurrentWorkspace() workspaceId: string) { return this.outboundService.getCampaigns(workspaceId); }

  @Get('campaigns/:id')
  async getCampaignDetails(@CurrentWorkspace() workspaceId: string, @Param('id') campaignId: string) { return this.outboundService.getCampaignDetails(workspaceId, campaignId); }

  @Post('campaigns/:id/pause')
  async pauseCampaign(@CurrentWorkspace() workspaceId: string, @Param('id') campaignId: string) { return this.outboundService.pauseCampaign(workspaceId, campaignId); }

  @Post('campaigns/:id/resume')
  async resumeCampaign(@CurrentWorkspace() workspaceId: string, @Param('id') campaignId: string, @Req() req: Request) {
    return this.outboundService.resumeCampaign(workspaceId, campaignId, getTrustedHost(req.headers.host || ''));
  }

  @Post('campaigns/:id/cancel')
  async cancelCampaign(@CurrentWorkspace() workspaceId: string, @Param('id') campaignId: string) { return this.outboundService.cancelCampaign(workspaceId, campaignId); }
}
