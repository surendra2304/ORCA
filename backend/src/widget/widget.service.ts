import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WidgetService {
  constructor(private prisma: PrismaService) {}

  async getConfig(workspaceId: string, agentId?: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    let textAgent: any = null;
    if (agentId) {
      textAgent = await this.prisma.agent.findFirst({
        where: { id: agentId, workspaceId, kind: 'chat' },
      });
    }

    if (!textAgent) {
      textAgent = await this.prisma.agent.findFirst({
        where: { workspaceId, kind: 'chat' },
        orderBy: { updatedAt: 'desc' },
      });
    }

    const voiceAgent = await this.prisma.agent.findFirst({
      where: { workspaceId, kind: 'voice' },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      brandColor: workspace.brandColor || '#0E7A5F',
      chatAgent: textAgent
        ? {
            agentId: textAgent.id,
            name: textAgent.name,
            greeting: textAgent.greeting || 'Hello! How can I help you today?',
            persona: textAgent.persona || 'Friendly',
          }
        : null,
      voice: voiceAgent
        ? {
            enabled: voiceAgent.status === 'live',
            agentId: voiceAgent.id,
            voiceName: voiceAgent.voiceName || 'Maya',
          }
        : null,
    };
  }

  async ping(workspaceId: string) {
    const now = new Date();
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { lastWidgetPingAt: now },
    });
    return { success: true, timestamp: now };
  }

  async verify(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { lastWidgetPingAt: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      installed: workspace.lastWidgetPingAt !== null,
      lastSeenAt: workspace.lastWidgetPingAt,
    };
  }
}
