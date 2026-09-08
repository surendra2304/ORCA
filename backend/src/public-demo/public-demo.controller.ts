import { Controller, Post, Body, NotFoundException } from '@nestjs/common';
import { PublicDemoService } from './public-demo.service';
import { ConversationService } from '../conversation/conversation.service';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public/demo')
@Public() // Exempt from JWT authentication
export class PublicDemoController {
  constructor(
    private publicDemoService: PublicDemoService,
    private conversationService: ConversationService,
    private prisma: PrismaService,
  ) {}

  @Post('ingest')
  async ingest(@Body() body: { url?: string; vertical?: string }) {
    return this.publicDemoService.createDemoWorkspace(body);
  }

  @Post('chat')
  async chat(
    @Body() body: { demoId: string; message: string; conversationId?: string },
  ) {
    const { demoId, message, conversationId } = body;
    
    // Ensure isolation (G-3): demoId must belong to a demo workspace
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: demoId, isDemo: true },
    });

    if (!workspace) {
      throw new NotFoundException('Demo workspace not found or has expired');
    }

    return this.conversationService.handlePublicChatTurn(demoId, {
      conversationId,
      message,
    });
  }
}
