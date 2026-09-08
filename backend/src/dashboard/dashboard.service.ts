import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppCacheService } from '../common/cache/cache.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private cacheService: AppCacheService,
  ) {}

  async getMetrics(workspaceId: string, range = '7d') {
    const cacheKey = `dashboard:metrics:${workspaceId}:${range}`;
    return this.cacheService.getOrSet(cacheKey, 120, async () => {
      return this.computeMetrics(workspaceId, range);
    });
  }

  invalidateMetrics(workspaceId: string) {
    this.cacheService.deletePrefix(`dashboard:metrics:${workspaceId}`);
  }

  private async computeMetrics(workspaceId: string, range = '7d') {
    const now = new Date();
    const activeDays = range === '30d' ? 30 : 7;
    const activeStart = new Date(now.getTime() - activeDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(activeStart.getTime() - activeDays * 24 * 60 * 60 * 1000);

    // Execute all 7 consolidated queries concurrently in a single parallel batch
    const [
      activeConvoRecords,
      previousConvos,
      activeLeadRecords,
      previousLeads,
      previousHotLeads,
      hotLeadsList,
      recentConvos,
    ] = await Promise.all([
      // 1. Active conversations (startedAt only - feeds count and sparkline)
      this.prisma.conversation.findMany({
        where: {
          workspaceId,
          startedAt: { gte: activeStart, lte: now },
        },
        select: { startedAt: true },
      }),

      // 2. Previous conversations count
      this.prisma.conversation.count({
        where: {
          workspaceId,
          startedAt: { gte: previousStart, lt: activeStart },
        },
      }),

      // 3. Active leads in a single pass (feeds total, hot, and new opps metrics + sparklines)
      this.prisma.lead.findMany({
        where: {
          workspaceId,
          createdAt: { gte: activeStart, lte: now },
        },
        select: { createdAt: true, score: true, status: true },
      }),

      // 4. Previous leads count
      this.prisma.lead.count({
        where: {
          workspaceId,
          createdAt: { gte: previousStart, lt: activeStart },
        },
      }),

      // 5. Previous hot leads count
      this.prisma.lead.count({
        where: {
          workspaceId,
          score: 'Hot',
          createdAt: { gte: previousStart, lt: activeStart },
        },
      }),

      // 6. Top Hot Leads needing attention (capped to 10 with selected fields)
      this.prisma.lead.findMany({
        where: {
          workspaceId,
          score: 'Hot',
        },
        select: {
          id: true,
          score: true,
          name: true,
          email: true,
          aiNote: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 7. Recent activity (top 5 conversations with selected fields)
      this.prisma.conversation.findMany({
        where: { workspaceId },
        select: {
          id: true,
          visitorLabel: true,
          startedAt: true,
          messageCount: true,
          captured: true,
        },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
    ]);

    // 1. Process Conversations Metric
    const activeConvos = activeConvoRecords.length;
    const convosDelta = previousConvos === 0
      ? (activeConvos > 0 ? 100 : 0)
      : Math.round(((activeConvos - previousConvos) / previousConvos) * 100);
    const convoDailyCounts = this.computeDailyCountsFromDates(
      activeConvoRecords.map((r) => r.startedAt),
      activeStart,
      activeDays,
    );
    const convoSpark = this.generateSparklinePoints(convoDailyCounts);

    // 2. Process Leads Captured Metric (Single-Pass Aggregation)
    const activeLeads = activeLeadRecords.length;
    const leadsDelta = previousLeads === 0
      ? (activeLeads > 0 ? 100 : 0)
      : Math.round(((activeLeads - previousLeads) / previousLeads) * 100);
    const leadDailyCounts = this.computeDailyCountsFromDates(
      activeLeadRecords.map((r) => r.createdAt),
      activeStart,
      activeDays,
    );
    const leadSpark = this.generateSparklinePoints(leadDailyCounts);

    // 3. Process Hot Leads Metric (Filtered from activeLeadRecords in-memory)
    const activeHotLeadRecords = activeLeadRecords.filter((l) => l.score === 'Hot');
    const activeHotLeads = activeHotLeadRecords.length;
    const hotLeadsDelta = activeHotLeads - previousHotLeads;
    const hotDailyCounts = this.computeDailyCountsFromDates(
      activeHotLeadRecords.map((r) => r.createdAt),
      activeStart,
      activeDays,
    );
    const hotSpark = this.generateSparklinePoints(hotDailyCounts);

    // 4. Process Opportunities Metric (Filtered from activeLeadRecords in-memory)
    const activeOppRecords = activeLeadRecords.filter((l) => l.status === 'New');
    const activeOpps = activeOppRecords.length;
    const oppsDailyCounts = this.computeDailyCountsFromDates(
      activeOppRecords.map((r) => r.createdAt),
      activeStart,
      activeDays,
    );
    const oppsSpark = this.generateSparklinePoints(oppsDailyCounts);

    // 5. Needs you (Hot leads)
    const needsYou = hotLeadsList.map((lead) => ({
      id: lead.id,
      score: lead.score as 'Hot' | 'Warm' | 'Cold',
      name: lead.name || 'Anonymous Lead',
      email: lead.email || 'No email provided',
      note: lead.aiNote || 'No explanation provided.',
      time: this.formatRelativeTime(lead.createdAt),
    }));

    // 6. Recent activity (Latest conversations)
    const recentActivity = recentConvos.map((c) => ({
      id: c.id,
      visitor: c.visitorLabel || 'Visitor',
      time: this.formatRelativeTime(c.startedAt),
      messages: c.messageCount,
      captured: c.captured,
    }));

    return {
      conversations: {
        value: String(activeConvos),
        deltaPct: `${convosDelta >= 0 ? '▲' : '▼'} ${Math.abs(convosDelta)}%`,
        deltaTone: convosDelta >= 0 ? 'up' : 'flat',
        spark: convoSpark,
      },
      leadsCaptured: {
        value: String(activeLeads),
        deltaPct: `${leadsDelta >= 0 ? '▲' : '▼'} ${Math.abs(leadsDelta)}%`,
        deltaTone: leadsDelta >= 0 ? 'up' : 'flat',
        spark: leadSpark,
      },
      hotLeads: {
        value: String(activeHotLeads),
        deltaPct: `${hotLeadsDelta >= 0 ? '▲' : '▼'} ${Math.abs(hotLeadsDelta)} new`,
        deltaTone: hotLeadsDelta >= 0 ? 'up' : 'flat',
        spark: hotSpark,
      },
      opportunities: {
        value: String(activeOpps),
        deltaPct: 'unworked',
        deltaTone: 'flat',
        spark: oppsSpark,
      },
      needsYou,
      recentActivity,
    };
  }

  private computeDailyCountsFromDates(
    dates: (Date | null | undefined)[],
    start: Date,
    days: number,
  ): number[] {
    const dailyCounts: number[] = new Array(days).fill(0);
    const startTime = start.getTime();
    const msInDay = 24 * 60 * 60 * 1000;

    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      if (!d) continue;

      const diffMs = d.getTime() - startTime;
      const dayIndex = Math.floor(diffMs / msInDay);
      if (dayIndex >= 0 && dayIndex < days) {
        dailyCounts[dayIndex]++;
      }
    }

    return dailyCounts;
  }

  private generateSparklinePoints(counts: number[]): string {
    const N = counts.length;
    if (N <= 1) return '0,13 70,13';
    const max = Math.max(...counts);
    const points: string[] = [];
    for (let i = 0; i < N; i++) {
      const x = Math.round(i * (70 / (N - 1)));
      const y = max === 0 ? 20 : 22 - Math.round((counts[i] / max) * 18);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
