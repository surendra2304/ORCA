import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { PublicKeyGuard } from '../common/guards/public-key.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';

import { CheckPlanLimit } from '../common/decorators/check-plan-limit.decorator';
import { PlanGateGuard } from '../common/guards/plan-gate.guard';

@Controller()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('conversations')
  @UseGuards(WorkspaceGuard)
  async getConversations(
    @CurrentWorkspace() workspaceId: string,
    @Query('tab') tab?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.conversationService.findMany(workspaceId, tab, agentId);
  }

  @Get('conversations/:id')
  @UseGuards(WorkspaceGuard)
  async getConversation(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.conversationService.findOne(workspaceId, id);
  }

  @Post('public/chat')
  @Public()
  @UseGuards(PublicKeyGuard, PlanGateGuard)
  @CheckPlanLimit('chatMessages')
  async publicChatTurn(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      agentId?: string;
      conversationId?: string;
      message: string;
      visitorMeta?: any;
    },
  ) {
    if (!body.message) {
      throw new BadRequestException('Message parameter is required');
    }
    return this.conversationService.handlePublicChatTurn(workspaceId, body);
  }

  @Post('chat/preview')
  @UseGuards(WorkspaceGuard)
  async previewChatTurn(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      agentId?: string;
      message: string;
      history?: { role: string; content: string }[];
    },
  ) {
    if (!body.message) {
      throw new BadRequestException('Message parameter is required');
    }
    return this.conversationService.handlePreviewChatTurn(workspaceId, body);
  }
}
