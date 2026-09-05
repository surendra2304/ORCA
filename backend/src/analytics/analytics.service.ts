import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AnalyticsSummary {
  totalInteractions: number;
  interactionsDelta: number;
  totalConversations: number;
  conversationsDelta: number;
  leadsCaptured: number;
  leadsDelta: number;
  conversionRate: number;
  conversionRateDelta: number;
  voiceMinutes: number;
  voiceMinutesDelta: number;
  avgDurationSec: number;
  hotLeadRatio: number;
}

export interface ChannelMetrics {
  channel: string;
  label: string;
  icon: string;
  volume: number;
  leads: number;
  conversionRate: number;
  avgDuration: string;
}

export interface FunnelStep {
  step: string;
  label: string;
  count: number;
  pctOfTotal: number;
  pctOfPrev: number;
}

export interface AgentPerformance {
  id: string;
  name: string;
  kind: string;
  status: string;
  persona: string;
  conversationsCount: number;
  leadsCount: number;
  conversionRate: number;
  avgDurationSec: number;
}

export interface TimelineDataPoint {
  date: string;
  label: string;
  conversations: number;
  leads: number;
  voiceMinutes: number;
}

export interface TopIntent {
  intent: string;
  count: number;
  percentage: number;
  scoreDistribution: { hot: number; warm: number; cold: number };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(workspaceId: string, range = '7d') {
    const now = new Date();
    let days = 7;
    if (range === '24h') days = 1;
    else if (range === '30d') days = 30;
    else if (range === '90d') days = 90;

    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Fetch conversations for current and previous period
    const currentConversations = await this.prisma.conversation.findMany({
      where: {
        workspaceId,
        startedAt: { gte: currentStart, lte: now },
      },
      include: {
        agent: { select: { id: true, name: true, kind: true, persona: true, status: true } },
      },
    });

    const previousConversationsCount = await this.prisma.conversation.count({
      where: {
        workspaceId,
        startedAt: { gte: previousStart, lt: currentStart },
      },
    });

    // 2. Fetch calls for current and previous period
    const currentCalls = await this.prisma.call.findMany({
      where: {
        workspaceId,
        createdAt: { gte: currentStart, lte: now },
      },
    });

    const previousCallsCount = await this.prisma.call.count({
      where: {
        workspaceId,
        createdAt: { gte: previousStart, lt: currentStart },
      },
    });

    // 3. Fetch leads for current and previous period
    const currentLeads = await this.prisma.lead.findMany({
      where: {
        workspaceId,
        createdAt: { gte: currentStart, lte: now },
      },
    });

    const previousLeadsCount = await this.prisma.lead.count({
      where: {
        workspaceId,
        createdAt: { gte: previousStart, lt: currentStart },
      },
    });

    // 4. Fetch all agents in workspace
    const agents = await this.prisma.agent.findMany({
      where: { workspaceId },
      select: { id: true, name: true, kind: true, status: true, persona: true },
    });

    // Calculate interaction counts & deltas
    const currentInteractions = currentConversations.length + currentCalls.length;
    const previousInteractions = previousConversationsCount + previousCallsCount;

    const interactionsDelta = previousInteractions === 0
      ? (currentInteractions > 0 ? 100 : 0)
      : Math.round(((currentInteractions - previousInteractions) / previousInteractions) * 100);

    const convosDelta = previousConversationsCount === 0
      ? (currentConversations.length > 0 ? 100 : 0)
      : Math.round(((currentConversations.length - previousConversationsCount) / previousConversationsCount) * 100);

    const leadsDelta = previousLeadsCount === 0
      ? (currentLeads.length > 0 ? 100 : 0)
      : Math.round(((currentLeads.length - previousLeadsCount) / previousLeadsCount) * 100);

    const currentConvRate = currentConversations.length === 0
      ? 0
      : Math.round((currentLeads.length / currentConversations.length) * 1000) / 10;

    const prevConvRate = previousConversationsCount === 0
      ? 0
      : Math.round((previousLeadsCount / previousConversationsCount) * 1000) / 10;

    const convRateDelta = Math.round((currentConvRate - prevConvRate) * 10) / 10;

    // Calculate voice minutes
    const totalVoiceSecs = currentCalls.reduce((acc, c) => acc + (c.durationSec || 0), 0) +
      currentConversations
        .filter(c => (c.channel as string) === 'voice' || (c.channel as string) === 'phone')
        .reduce((acc, c) => acc + (c.durationSec || 0), 0);
    const totalVoiceMinutes = Math.round(totalVoiceSecs / 60);

    // Calculate average duration
    const totalDurSecs = currentConversations.reduce((acc, c) => acc + (c.durationSec || 0), 0);
    const avgDurationSec = currentConversations.length === 0 ? 0 : Math.round(totalDurSecs / currentConversations.length);

    // Hot lead ratio
    const hotCount = currentLeads.filter(l => l.score === 'Hot').length;
    const warmCount = currentLeads.filter(l => l.score === 'Warm').length;
    const coldCount = currentLeads.filter(l => l.score === 'Cold' || !l.score).length;
    const hotRatio = currentLeads.length === 0 ? 0 : Math.round((hotCount / currentLeads.length) * 100);

    // Summary
    const summary: AnalyticsSummary = {
      totalInteractions: currentInteractions,
      interactionsDelta,
      totalConversations: currentConversations.length,
      conversationsDelta: convosDelta,
      leadsCaptured: currentLeads.length,
      leadsDelta,
      conversionRate: currentConvRate,
      conversionRateDelta: convRateDelta,
      voiceMinutes: totalVoiceMinutes,
      voiceMinutesDelta: 0,
      avgDurationSec,
      hotLeadRatio: hotRatio,
    };

    // 5. Funnel calculations
    const estimatedVisitors = Math.max(currentConversations.length * 2, currentInteractions + 15);
    const engagedCount = currentConversations.length;
    const capturedCount = currentLeads.length;
    const qualifiedCount = hotCount + warmCount;
    const wonCount = currentLeads.filter(l => l.status === 'Won').length;

    const funnel: FunnelStep[] = [
      {
        step: 'visitors',
        label: 'Website & Phone Visitors',
        count: estimatedVisitors,
        pctOfTotal: 100,
        pctOfPrev: 100,
      },
      {
        step: 'engaged',
        label: 'Engaged with AI Employee',
        count: engagedCount,
        pctOfTotal: estimatedVisitors === 0 ? 0 : Math.round((engagedCount / estimatedVisitors) * 100),
        pctOfPrev: estimatedVisitors === 0 ? 0 : Math.round((engagedCount / estimatedVisitors) * 100),
      },
      {
        step: 'captured',
        label: 'Contact Info Captured',
        count: capturedCount,
        pctOfTotal: estimatedVisitors === 0 ? 0 : Math.round((capturedCount / estimatedVisitors) * 100),
        pctOfPrev: engagedCount === 0 ? 0 : Math.round((capturedCount / engagedCount) * 100),
      },
      {
        step: 'qualified',
        label: 'AI Qualified (Hot/Warm)',
        count: qualifiedCount,
        pctOfTotal: estimatedVisitors === 0 ? 0 : Math.round((qualifiedCount / estimatedVisitors) * 100),
        pctOfPrev: capturedCount === 0 ? 0 : Math.round((qualifiedCount / capturedCount) * 100),
      },
      {
        step: 'won',
        label: 'Deals Won / Closed',
        count: wonCount,
        pctOfTotal: estimatedVisitors === 0 ? 0 : Math.round((wonCount / estimatedVisitors) * 100),
        pctOfPrev: qualifiedCount === 0 ? 0 : Math.round((wonCount / qualifiedCount) * 100),
      },
    ];

    // 6. Channel breakdown
    const chatConvos = currentConversations.filter(c => c.channel === 'web' || !c.channel);
    const webVoiceConvos = currentConversations.filter(c => (c.channel as string) === 'voice');
    const telephonyCalls = currentCalls;

    const chatLeads = currentLeads.filter(l => !l.source || l.source.toLowerCase().includes('chat') || l.source.toLowerCase().includes('web')).length;
    const voiceLeads = currentLeads.filter(l => l.source && (l.source.toLowerCase().includes('voice') || l.source.toLowerCase().includes('phone'))).length;

    const channels: ChannelMetrics[] = [
      {
        channel: 'chat',
        label: 'Website Chat Widget',
        icon: '💬',
        volume: chatConvos.length,
        leads: chatLeads,
        conversionRate: chatConvos.length === 0 ? 0 : Math.round((chatLeads / chatConvos.length) * 100),
        avgDuration: `${Math.round(chatConvos.reduce((a, c) => a + (c.durationSec || 0), 0) / (chatConvos.length || 1))}s`,
      },
      {
        channel: 'voice_web',
        label: 'In-Browser Web Voice',
        icon: '🎙️',
        volume: webVoiceConvos.length,
        leads: voiceLeads,
        conversionRate: webVoiceConvos.length === 0 ? 0 : Math.round((voiceLeads / (webVoiceConvos.length || 1)) * 100),
        avgDuration: `${Math.round(webVoiceConvos.reduce((a, c) => a + (c.durationSec || 0), 0) / (webVoiceConvos.length || 1))}s`,
      },
      {
        channel: 'telephony',
        label: 'Inbound & Outbound Phone',
        icon: '📞',
        volume: telephonyCalls.length,
        leads: Math.max(0, currentLeads.length - chatLeads - voiceLeads),
        conversionRate: telephonyCalls.length === 0 ? 0 : Math.round((Math.max(0, currentLeads.length - chatLeads - voiceLeads) / telephonyCalls.length) * 100),
        avgDuration: `${Math.round(telephonyCalls.reduce((a, c) => a + (c.durationSec || 0), 0) / (telephonyCalls.length || 1))}s`,
      },
    ];

    // 7. Lead score distribution
    const totalScoredLeads = currentLeads.length || 1;
    const scoreDistribution = {
      hot: { count: hotCount, percentage: Math.round((hotCount / totalScoredLeads) * 100) },
      warm: { count: warmCount, percentage: Math.round((warmCount / totalScoredLeads) * 100) },
      cold: { count: coldCount, percentage: Math.round((coldCount / totalScoredLeads) * 100) },
    };

    // 8. Top intents & Topics from leads
    const intentMap: Record<string, { count: number; hot: number; warm: number; cold: number }> = {};
    for (const lead of currentLeads) {
      const intentKey = lead.intent ? lead.intent.trim() : 'General Inquiry';
      if (!intentMap[intentKey]) {
        intentMap[intentKey] = { count: 0, hot: 0, warm: 0, cold: 0 };
      }
      intentMap[intentKey].count++;
      if (lead.score === 'Hot') intentMap[intentKey].hot++;
      else if (lead.score === 'Warm') intentMap[intentKey].warm++;
      else intentMap[intentKey].cold++;
    }

    const topIntents: TopIntent[] = Object.entries(intentMap)
      .map(([intent, stats]) => ({
        intent,
        count: stats.count,
        percentage: Math.round((stats.count / totalScoredLeads) * 100),
        scoreDistribution: {
          hot: stats.hot,
          warm: stats.warm,
          cold: stats.cold,
        },
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Fallback sample intents if no leads yet
    if (topIntents.length === 0) {
      topIntents.push(
        { intent: 'Pricing & Enterprise Plans', count: 0, percentage: 0, scoreDistribution: { hot: 0, warm: 0, cold: 0 } },
        { intent: 'Custom Voice Agent Setup', count: 0, percentage: 0, scoreDistribution: { hot: 0, warm: 0, cold: 0 } },
        { intent: 'Refund Policy & Support Terms', count: 0, percentage: 0, scoreDistribution: { hot: 0, warm: 0, cold: 0 } },
        { intent: 'BYON Telephony Integration', count: 0, percentage: 0, scoreDistribution: { hot: 0, warm: 0, cold: 0 } },
      );
    }

    // 9. AI Employee Leaderboard
    const agentPerformance: AgentPerformance[] = agents.map(agent => {
      const agentConvos = currentConversations.filter(c => c.agentId === agent.id);
      const agentLeads = currentLeads.filter(l => {
        const matchingConvo = currentConversations.find(c => c.id === l.conversationId);
        return matchingConvo?.agentId === agent.id;
      });

      const totalAgentDuration = agentConvos.reduce((a, c) => a + (c.durationSec || 0), 0);
      const avgAgentDur = agentConvos.length === 0 ? 0 : Math.round(totalAgentDuration / agentConvos.length);
      const convRate = agentConvos.length === 0 ? 0 : Math.round((agentLeads.length / agentConvos.length) * 100);

      return {
        id: agent.id,
        name: agent.name,
        kind: agent.kind,
        status: agent.status,
        persona: agent.persona || 'Helpful Specialist',
        conversationsCount: agentConvos.length,
        leadsCount: agentLeads.length,
        conversionRate: convRate,
        avgDurationSec: avgAgentDur,
      };
    }).sort((a, b) => b.conversationsCount - a.conversationsCount);

    // 10. Timeline chart points
    const timeline: TimelineDataPoint[] = [];
    const stepDays = Math.max(1, Math.min(days, 14));
    const intervalMs = (days * 24 * 60 * 60 * 1000) / stepDays;

    for (let i = 0; i < stepDays; i++) {
      const tStart = new Date(currentStart.getTime() + i * intervalMs);
      const tEnd = new Date(tStart.getTime() + intervalMs);

      const convosInSlot = currentConversations.filter(c => c.startedAt >= tStart && c.startedAt < tEnd).length;
      const leadsInSlot = currentLeads.filter(l => l.createdAt >= tStart && l.createdAt < tEnd).length;
      const callsInSlot = currentCalls.filter(c => c.createdAt >= tStart && c.createdAt < tEnd);
      const voiceMinsInSlot = Math.round(callsInSlot.reduce((a, c) => a + (c.durationSec || 0), 0) / 60);

      const label = days <= 1
        ? tStart.toLocaleTimeString('en-US', { hour: 'numeric' })
        : tStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

      timeline.push({
        date: tStart.toISOString(),
        label,
        conversations: convosInSlot,
        leads: leadsInSlot,
        voiceMinutes: voiceMinsInSlot,
      });
    }

    return {
      summary,
      funnel,
      channels,
      scoreDistribution,
      topIntents,
      agentPerformance,
      timeline,
      range,
    };
  }
}
