import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppCacheService } from '../common/cache/cache.service';

@Injectable()
export class LeadService {
  constructor(
    private prisma: PrismaService,
    private cacheService: AppCacheService,
  ) {}

  async findMany(workspaceId: string, query: { score?: string; status?: string; agentId?: string }) {
    return this.prisma.lead.findMany({
      where: {
        workspaceId,
        ...(query.score ? { score: query.score as string } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.agentId ? { conversation: { agentId: query.agentId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, workspaceId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async updateStatus(workspaceId: string, id: string, status: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, workspaceId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    this.cacheService.deletePrefix(`dashboard:metrics:${workspaceId}`);

    return this.prisma.lead.update({
      where: { id },
      data: { status },
    });
  }

  async generateCsvString(workspaceId: string): Promise<string> {
    const leads = await this.prisma.lead.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Score', 'Status', 'Intent', 'AI Note', 'Source', 'Created At'];
    
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = leads.map(l => [
      l.id,
      l.name,
      l.email,
      l.phone,
      l.score,
      l.status,
      l.intent,
      l.aiNote,
      l.source,
      l.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsv).join(',')),
    ].join('\n');

    return csvContent;
  }
}
