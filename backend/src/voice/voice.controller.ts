import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { PublicKeyGuard } from '../common/guards/public-key.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';

@Controller()
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('voice/token')
  @UseGuards(WorkspaceGuard)
  async getVoiceToken(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { agentId: string; resumptionHandle?: string },
  ) {
    return this.voiceService.createToken(workspaceId, body.agentId, body.resumptionHandle);
  }

  @Post('public/voice/token')
  @Public()
  @UseGuards(PublicKeyGuard)
  async getPublicVoiceToken(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { agentId: string; resumptionHandle?: string },
  ) {
    return this.voiceService.createToken(workspaceId, body.agentId, body.resumptionHandle);
  }

  @Post('public/voice/finalize')
  @Public()
  @UseGuards(PublicKeyGuard)
  async finalizeVoiceCall(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: {
      agentId: string;
      conversationId?: string;
      transcript: { role: string; content: string }[];
      visitorMeta?: any;
    },
  ) {
    return this.voiceService.finalize(workspaceId, body);
  }
}
