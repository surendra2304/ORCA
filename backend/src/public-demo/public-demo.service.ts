import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KbService } from '../kb/kb.service';
import { randomBytes } from 'crypto';

@Injectable()
export class PublicDemoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicDemoService.name);
  private cleanupInterval!: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    private kbService: KbService,
  ) {}

  onModuleInit() {
    // Run cleanup immediately, then every hour
    this.purgeExpiredDemos().catch((err) =>
      this.logger.error('Failed to run initial expired demo workspace cleanup:', err),
    );
    this.cleanupInterval = setInterval(() => {
      this.purgeExpiredDemos().catch((err) =>
        this.logger.error('Failed to run scheduled expired demo workspace cleanup:', err),
      );
    }, 60 * 60 * 1000); // 1 hour
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async createDemoWorkspace(payload: { url?: string; vertical?: string }) {
    const { url, vertical } = payload;

    // Create a demo workspace with expiresAt set to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const publicKey = `demo-${randomBytes(16).toString('hex')}`;
    const workspaceName = url 
      ? `Demo (${url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]})` 
      : `Demo (${vertical || 'General'})`;

    const workspace = await this.prisma.workspace.create({
      data: {
        name: workspaceName,
        websiteUrl: url || null,
        publicKey,
        isDemo: true,
        expiresAt,
      },
    });

    // Create a default demo agent
    const agent = await this.prisma.agent.create({
      data: {
        workspaceId: workspace.id,
        kind: 'chat',
        name: 'Demo Assistant',
        status: 'live',
        persona: 'Friendly',
        greeting: url 
          ? `Hi! I've scanned your website. What questions can I help answer?`
          : `Hello! I'm your AI assistant for this ${vertical || 'General'} template. Ask me anything!`,
        goal: 'qualify',
        channels: { web: true, phone: false },
        connectedKbDocumentIds: [],
      },
    });

    let documentId: string | null = null;

    if (url) {
      // Ingest the URL
      const doc = await this.kbService.createDocument(
        workspace.id,
        url,
        'WEBSITE',
        { url }
      );
      documentId = doc.id;
    } else if (vertical) {
      // Seeding vertical context
      const verticalContent = this.getVerticalContent(vertical);
      const doc = await this.kbService.createDocument(
        workspace.id,
        `Context: ${vertical}`,
        'FAQ',
        {
          faqItems: [
            { q: `Tell me about the company / services`, a: verticalContent.overview },
            { q: `What is the pricing?`, a: verticalContent.pricing },
            { q: `How do I sign up or get in touch?`, a: verticalContent.contact },
          ],
        }
      );
      documentId = doc.id;
    }

    if (documentId) {
      // Update the agent to point to this KB document
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: {
          connectedKbDocumentIds: [documentId],
        },
      });
    }

    return {
      demoId: workspace.id,
      agentId: agent.id,
      greeting: agent.greeting,
      publicKey: workspace.publicKey,
    };
  }

  private getVerticalContent(vertical: string) {
    switch (vertical.toLowerCase()) {
      case 'saas':
        return {
          overview: `KaliGanAI is a state-of-the-art SaaS platform that helps businesses deploy AI employees that turn website visitors and callers into qualified leads using grounded chat and BYON inbound phone voice.`,
          pricing: `We offer Starter at $39/mo, Growth at $129/mo (includes web voice agents), and Agency (custom, includes phone lines).`,
          contact: `You can sign up directly on our website or get in touch at hello@kaligan.ai.`,
        };
      case 'real_estate':
        return {
          overview: `Emerald Realty is a leading real estate agency specializing in residential property sales, buying, and rental property management. We have properties across California including Los Angeles and San Francisco.`,
          pricing: `Consultations and virtual tours are free. Listings range from $500k condos to multi-million dollar estates.`,
          contact: `Schedule a viewing by emailing homes@emeraldrealty.com.`,
        };
      case 'agency':
        return {
          overview: `Apex Digital is a full-service marketing agency helping SaaS and B2B companies scale their lead generation, SEO, and paid advertisements.`,
          pricing: `Our packages start at $1,500/mo for Starter up to $3,500/mo for Growth campaigns.`,
          contact: `Book a strategy session by reaching out to info@apexdigital.com.`,
        };
      case 'services':
      default:
        return {
          overview: `Green Clean offers premium, eco-friendly house and commercial cleaning services. We use 100% biodegradable and non-toxic cleaning products.`,
          pricing: `Standard cleanings start at $120, deep cleaning at $250, and move-in/move-out packages at $350.`,
          contact: `Book your cleaning slot by emailing bookings@greenclean.com.`,
        };
    }
  }

  async purgeExpiredDemos() {
    this.logger.log('Running expired demo workspaces cleanup...');
    const now = new Date();
    const expiredWorkspaces = await this.prisma.workspace.findMany({
      where: {
        isDemo: true,
        expiresAt: {
          lt: now,
        },
      },
      select: { id: true },
    });

    if (expiredWorkspaces.length === 0) {
      return;
    }

    this.logger.log(`Found ${expiredWorkspaces.length} expired demo workspaces to purge.`);

    for (const ws of expiredWorkspaces) {
      try {
        // Deleting the workspace cascades deletes to documents, chunks, agents, conversations, etc.
        await this.prisma.workspace.delete({
          where: { id: ws.id },
        });
        this.logger.log(`Purged demo workspace ${ws.id}`);
      } catch (err) {
        this.logger.error(`Failed to purge demo workspace ${ws.id}:`, err);
      }
    }
  }
}
