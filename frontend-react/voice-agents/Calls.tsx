import { useState, useEffect, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PageHead, ScoreBadge } from "../components/grok";
import * as I from "../components/icons";
import { api } from "../lib/api";
import { getMediaUrl, formatDuration, formatTime, getScoreColor } from "../lib/utils";
import { OutboundDialerModal } from "../components/telephony/OutboundDialerModal";
import { NewCampaignModal } from "../components/telephony/NewCampaignModal";
import { GModal } from "../components/grok";
import { getCached, setCached } from "../lib/cache";
import type { CallItem, CallConversation, Campaign } from "../types/call";

export default function Calls() {
  const [calls, setCalls] = useState<CallItem[]>(() => getCached("callsListCache") || []);
  const [loading, setLoading] = useState(() => !getCached("callsListCache"));
  const [error, setError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(() => (getCached("callsListCache") as CallItem[])?.[0]?.id || null);
  const [convoCache, setConvoCache] = useState<Record<string, CallConversation | null>>({});
  const [convoLoading, setConvoLoading] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<"calls" | "campaigns">("calls");
  const [directionFilter, setDirectionFilter] = useState<"all" | "inbound" | "outbound">("all");

  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Modals
  const [dialerOpen, setDialerOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);

  const fetchCalls = useCallback(async (isPolling = false) => {
    const hasCache = !!getCached("callsListCache");
    if (!hasCache && !isPolling) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await api.get("/telephony/calls");
      setCached("callsListCache", data);
      setCalls(data || []);
      if (data && data.length > 0) {
        setSelectedCallId((prev) => prev || data[0].id);
      }
    } catch (err: unknown) {
      if (!hasCache && !isPolling) {
        const error = err as Error;
        setError(error.message || "Failed to load call logs");
      }
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const data = await api.get("/telephony/outbound/campaigns");
      setCampaigns(data || []);
    } catch (e) {
      console.error("Failed to load campaigns", e);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
    fetchCampaigns();

    // Auto-poll calls and campaigns every 4 seconds for live recording/transcript updates
    const pollInterval = setInterval(() => {
      fetchCalls(true);
      fetchCampaigns();
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [fetchCalls, fetchCampaigns]);

  // Filtered calls
  const filteredCalls = calls.filter((c) => {
    if (directionFilter === "inbound") return c.direction !== "outbound";
    if (directionFilter === "outbound") return c.direction === "outbound";
    return true;
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredCalls.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const selectedCall = filteredCalls.find((c) => c.id === selectedCallId) || filteredCalls[0] || null;
  const selectedConvo = selectedCall ? convoCache[selectedCall.callSid] : null;

  // Fetch or re-fetch conversation transcript when a call is selected or updated
  useEffect(() => {
    if (!selectedCall) return;
    const { callSid } = selectedCall;

    let isSubscribed = true;
    const fetchConversation = async () => {
      try {
        const data = await api.get(`/telephony/calls/${callSid}/conversation`);
        if (isSubscribed) {
          setConvoCache((prev) => ({ ...prev, [callSid]: data }));
        }
      } catch (err) {
        console.error("Failed to load call conversation", err);
      } finally {
        if (isSubscribed) {
          setConvoLoading(false);
        }
      }
    };

    if (convoCache[callSid] === undefined) {
      setConvoLoading(true);
    }
    fetchConversation();

    return () => {
      isSubscribed = false;
    };
  }, [selectedCall?.id, selectedCall?.callSid, selectedCall?.durationSec, selectedCall?.status]);

  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignToCancel, setCampaignToCancel] = useState<string | null>(null);

  // Handle Campaign actions
  const handlePauseCampaign = async (id: string) => {
    try {
      await api.post(`/telephony/outbound/campaigns/${id}/pause`);
      fetchCampaigns();
    } catch (err: unknown) {
      const error = err as Error;
      setCampaignError(error.message || "Failed to pause campaign");
    }
  };

  const handleResumeCampaign = async (id: string) => {
    try {
      await api.post(`/telephony/outbound/campaigns/${id}/resume`);
      fetchCampaigns();
    } catch (err: unknown) {
      const error = err as Error;
      setCampaignError(error.message || "Failed to resume campaign");
    }
  };

  const handleCancelCampaign = async (id: string) => {
    try {
      await api.post(`/telephony/outbound/campaigns/${id}/cancel`);
      fetchCampaigns();
      setCampaignToCancel(null);
    } catch (err: unknown) {
      const error = err as Error;
      setCampaignError(error.message || "Failed to cancel campaign");
    }
  };

  // Compute metrics
  const totalCalls = calls.length;
  const outboundCount = calls.filter((c) => c.direction === "outbound").length;
  const inboundCount = calls.filter((c) => c.direction !== "outbound").length;
  const avgDuration =
    totalCalls > 0
      ? Math.round(calls.reduce((sum, c) => sum + c.durationSec, 0) / totalCalls)
      : 0;
  const avgLatency =
    totalCalls > 0
      ? Math.round(
          calls.reduce((sum, c) => sum + (c.latencyMs || 0), 0) /
            (calls.filter((c) => c.latencyMs).length || 1),
        ) || 0
      : 0;
  const totalLeads = calls.filter(
    (c) => convoCache[c.callSid]?.captured || c.outcome?.toLowerCase().includes("lead"),
  ).length;
  const conversionRate =
    totalCalls > 0 ? Math.round((totalLeads / totalCalls) * 100) : 0;

  return (
    <>
      <PageHead
        title="Telephony & Calls"
        subtitle="Review phone calls and automated outbound calling campaigns."
        right={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDialerOpen(true)}
              className="g-btn"
            >
              <I.Phone width={14} height={14} /> <span>Quick Dial</span>
            </button>
            <button
              onClick={() => setCampaignModalOpen(true)}
              className="g-btn-2"
            >
              <I.Plus width={14} height={14} /> <span>New Campaign</span>
            </button>
            <button
              onClick={() => {
                fetchCalls();
                fetchCampaigns();
              }}
              className="g-btn-2"
              disabled={loading}
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span> <span>Refresh</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="g-card p-4 text-red-600 border border-red-200 bg-red-50 mb-6 flex justify-between items-center text-[13px]">
          <span>{error}</span>
          <button className="g-btn-2 text-[12px] h-[30px] px-3 font-medium" onClick={() => fetchCalls()}>
            Retry
          </button>
        </div>
      )}

      {/* Analytics Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 fadeup">
        <div className="g-card p-4">
          <div className="text-[11.5px] font-semibold text-[var(--g-muted-foreground)] uppercase">Total Calls</div>
          <div className="font-semibold text-2xl mt-1 text-[var(--g-foreground)]">
            {totalCalls}{" "}
            <span className="text-xs font-normal text-[var(--g-muted-foreground)]">
              ({inboundCount} in / {outboundCount} out)
            </span>
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-[11.5px] font-semibold text-[var(--g-muted-foreground)] uppercase">Avg Duration</div>
          <div className="font-semibold text-2xl mt-1 text-[var(--g-foreground)]">
            {formatDuration(avgDuration)}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-[11.5px] font-semibold text-[var(--g-muted-foreground)] uppercase">Avg Latency</div>
          <div className="font-semibold text-2xl mt-1 text-[var(--g-foreground)]">
            {avgLatency ? `${(avgLatency / 1000).toFixed(2)}s` : "0.85s"}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-[11.5px] font-semibold text-[var(--g-muted-foreground)] uppercase">Lead Conversion</div>
          <div className="font-semibold text-2xl mt-1 text-[var(--g-foreground)]">
            {conversionRate}% <span className="text-xs font-normal text-[var(--g-muted-foreground)]">({totalLeads} leads)</span>
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-[11.5px] font-semibold text-[var(--g-muted-foreground)] uppercase">Campaigns</div>
          <div className="font-semibold text-2xl mt-1 text-[var(--g-foreground)]">
            {campaigns.length} <span className="text-xs font-normal text-[var(--g-muted-foreground)]">active</span>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 fadeup">
        <div className="inline-flex items-center rounded-full border border-[var(--g-border)] bg-[var(--g-surface)] p-0.5 select-none h-[36px] shadow-xs">
          <button
            onClick={() => setActiveTab("calls")}
            className={`px-4 h-full rounded-full transition-all text-[12.5px] cursor-pointer flex items-center gap-1.5 ${
              activeTab === "calls"
                ? "bg-[var(--g-foreground)] text-[var(--g-background)] font-medium shadow-xs"
                : "text-[var(--g-muted-foreground)] hover:text-[var(--g-foreground)]"
            }`}
          >
            Call Logs ({calls.length})
          </button>
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`px-4 h-full rounded-full transition-all text-[12.5px] cursor-pointer flex items-center gap-1.5 ${
              activeTab === "campaigns"
                ? "bg-[var(--g-foreground)] text-[var(--g-background)] font-medium shadow-xs"
                : "text-[var(--g-muted-foreground)] hover:text-[var(--g-foreground)]"
            }`}
          >
            Outbound Campaigns ({campaigns.length})
          </button>
        </div>

        {activeTab === "calls" && (
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-[var(--g-muted-foreground)] mr-1">Direction:</span>
            {(["all", "inbound", "outbound"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setDirectionFilter(dir)}
                className={`px-3 py-1 text-[12.5px] rounded-full capitalize transition-all cursor-pointer ${
                  directionFilter === dir
                    ? "bg-[var(--g-foreground)] text-[var(--g-background)] font-medium shadow-xs"
                    : "bg-[#ffffff] border border-[var(--g-border)] text-[var(--g-muted-foreground)] hover:text-[var(--g-foreground)]"
                }`}
              >
                {dir === "all" ? "All" : dir}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === "campaigns" ? (
        /* Campaigns Tab Content */
        <div className="fadeup space-y-4">
          {campaignsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="card p-6 h-48 animate-pulse bg-surface-2" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-teal-400 grid place-items-center mx-auto mb-4">
                <I.Users width={26} height={26} />
              </div>
              <h3 className="text-lg font-bold">No Outbound Campaigns Yet</h3>
              <p className="text-ink-muted text-sm mt-1 max-w-sm mx-auto">
                Launch automated speech-to-speech voice campaigns to follow up with leads or conduct outreach.
              </p>
              <button
                onClick={() => setCampaignModalOpen(true)}
                className="btn btn-primary mt-4 inline-flex items-center gap-1.5"
              >
                <I.Plus width={14} height={14} /> Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => {
                const progressPct =
                  camp.totalLeads > 0 ? Math.round((camp.completedLeads / camp.totalLeads) * 100) : 0;
                const isRunning = camp.status === "running";
                const isPaused = camp.status === "paused";
                const isCompleted = camp.status === "completed";
                const isActive = isRunning || isPaused;

                return (
                  <div key={camp.id} className="card p-5 hover:border-mint-300 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-display font-bold text-base text-ink">{camp.name}</h4>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Agent: <span className="font-semibold text-ink">{camp.agent?.name || "Voice Agent"}</span> · From:{" "}
                            {camp.fromNumber}
                          </p>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            isRunning
                              ? "bg-emerald-50 text-success animate-pulse"
                              : isPaused
                              ? "bg-yellow-50 text-warm"
                              : isCompleted
                              ? "bg-mint-100 text-emerald-800"
                              : "bg-surface-3 text-ink-muted"
                          }`}
                        >
                          ● {camp.status}
                        </span>
                      </div>

                      {camp.customPrompt && (
                        <div className="mt-3 p-2.5 bg-surface-2 rounded-lg text-xs text-ink-muted italic line-clamp-2">
                          “{camp.customPrompt}”
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-ink-muted">Queue Progress</span>
                          <span className="text-emerald-800">
                            {camp.completedLeads} / {camp.totalLeads} ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-line text-xs">
                        <div>
                          <span className="text-ink-muted block text-[11px]">Successful Answers</span>
                          <span className="font-bold text-emerald-800 text-sm">{camp.successfulLeads}</span>
                        </div>
                        <div>
                          <span className="text-ink-muted block text-[11px]">Created</span>
                          <span className="font-semibold text-ink">{formatTime(camp.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-end gap-2">
                      {isRunning && (
                        <button
                          onClick={() => handlePauseCampaign(camp.id)}
                          className="btn btn-ghost !py-1 text-xs text-warm hover:bg-yellow-50"
                        >
                          ⏸ Pause
                        </button>
                      )}
                      {isPaused && (
                        <button
                          onClick={() => handleResumeCampaign(camp.id)}
                          className="btn btn-primary !py-1 text-xs"
                        >
                          ▶ Resume
                        </button>
                      )}
                      {isActive && (
                        <button
                          onClick={() => setCampaignToCancel(camp.id)}
                          className="btn btn-ghost !py-1 text-xs text-hot hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Calls Tab Content */
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 fadeup">
          {/* Left Side: Call List */}
          <div className="card overflow-hidden flex flex-col h-[600px]">
            <div className="p-3 border-b border-line bg-surface-2 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {directionFilter === "all"
                  ? "Recent Calls"
                  : directionFilter === "outbound"
                  ? "Outbound Calls"
                  : "Inbound Calls"}
              </span>
              <span className="text-xs text-ink-muted font-semibold">{filteredCalls.length} logs</span>
            </div>

            <div ref={parentRef} className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-surface-2 border border-line rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredCalls.length === 0 ? (
                <div className="p-8 text-center text-ink-muted text-[13.5px]">
                  No {directionFilter !== "all" ? directionFilter : ""} calls found.
                </div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const c = filteredCalls[virtualRow.index];
                    if (!c) return null;
                    const itemConvo = convoCache[c.callSid];
                    const rawScore =
                      itemConvo?.score ||
                      c.score ||
                      (c.outcome?.toLowerCase().includes("lead")
                        ? "Hot"
                        : c.durationSec >= 30
                        ? "Warm"
                        : "Cold");
                    const isCaptured =
                      itemConvo?.captured ?? (c.captured || c.outcome?.toLowerCase().includes("lead"));

                    return (
                      <div
                        key={c.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <button
                          onClick={() => setSelectedCallId(c.id)}
                          className={`w-full text-left flex items-start gap-3.5 px-4 py-3.5 border-b border-line transition ${
                            selectedCallId === c.id ? "bg-[var(--g-surface-2)] font-semibold" : "hover:bg-[var(--g-surface)]"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                            style={{ background: getScoreColor(rawScore) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xs font-bold px-1.5 py-0.25 rounded ${
                                    c.direction === "outbound"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                  title={c.direction === "outbound" ? "Outbound Call" : "Inbound Call"}
                                >
                                  {c.direction === "outbound" ? "↗ Out" : "↙ In"}
                                </span>
                                <b className="font-semibold text-[13.5px] text-ink truncate">{c.fromNumber}</b>
                              </div>
                              <span className="text-ink-muted text-[11px]">{formatTime(c.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-ink-muted text-[12px]">{formatDuration(c.durationSec)}</span>
                              {c.recordingUrl && (
                                <span className="text-[9.5px] font-bold bg-surface-3 text-ink-muted px-1.5 py-0.25 rounded-full flex items-center gap-1">
                                  <span className="flex items-center gap-1.5"><I.Mic width={14} height={14} /> Audio</span>
                                </span>
                              )}
                              {isCaptured && (
                                <span className="text-[9.5px] font-bold bg-mint-100 text-emerald-800 px-1.5 py-0.25 rounded-full">
                                  Lead captured
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Call Transcript & Info */}
          {!selectedCall ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center h-[600px]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-teal-400 grid place-items-center mb-4">
                <I.Phone width={26} height={26} />
              </div>
              <h3 className="text-lg font-bold">No call selected</h3>
              <p className="text-ink-muted text-[14.5px] mt-1.5 max-w-xs">
                Select a phone call from the list to review the voice transcript and lead scoring.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 h-[600px]">
              {/* Transcript pane */}
              <div className="card p-5 flex flex-col h-full overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-line mb-4 shrink-0">
                  <span className="font-semibold text-sm">{selectedCall.fromNumber}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      selectedCall.direction === "outbound"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {selectedCall.direction === "outbound" ? "↗ Outbound" : "↙ Inbound"}
                  </span>
                  {selectedConvo?.score && <ScoreBadge score={selectedConvo.score} />}
                  <span className="ml-auto text-ink-muted text-[12px]">
                    Duration: {formatDuration(selectedCall.durationSec)} · {formatTime(selectedCall.createdAt)}
                  </span>
                </div>

                {selectedCall.recordingUrl && (
                  <div className="mb-4 p-3 rounded-xl bg-surface-2 border border-line shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11.5px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <span className="flex items-center gap-1.5"><I.Mic width={14} height={14} /> Audio Recording (Caller + AI)</span>
                      </span>
                      <a
                        href={getMediaUrl(selectedCall.recordingUrl)}
                        download={`call_${selectedCall.callSid}.wav`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-teal-600 hover:underline font-semibold"
                      >
                        Download Audio ↗
                      </a>
                    </div>
                    <audio
                      src={getMediaUrl(selectedCall.recordingUrl)}
                      controls
                      preload="metadata"
                      className="w-full h-9 rounded outline-none"
                    />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  {convoLoading ? (
                    <div className="p-8 space-y-4">
                      <div className="h-10 bg-surface-2 rounded-2xl w-3/4 animate-pulse" />
                      <div className="h-10 bg-emerald-50 rounded-2xl w-2/3 ml-auto animate-pulse" />
                      <div className="h-10 bg-surface-2 rounded-2xl w-1/2 animate-pulse" />
                    </div>
                  ) : selectedConvo?.messages && selectedConvo.messages.length > 0 ? (
                    selectedConvo.messages.map((m) => {
                      const isVisitor = m.role === "visitor";
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[85%] flex flex-col ${
                            isVisitor ? "items-start" : "items-end ml-auto"
                          }`}
                        >
                          <div className="text-ink-muted text-[10px] mb-1 font-bold uppercase tracking-wider">
                            {isVisitor ? "Caller / Recipient" : "AI Assistant"}
                          </div>
                          <div
                            className={`px-3 py-2 rounded-2xl text-[13.5px] leading-relaxed inline-block border ${
                              isVisitor
                                ? "bg-surface-2 border-line rounded-tl-sm text-ink"
                                : "bg-emerald-50 border-mint-300 rounded-tr-sm text-ink"
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-ink-muted italic text-[13px]">
                      No conversation messages logged. Call duration: {formatDuration(selectedCall.durationSec)}.
                    </div>
                  )}
                </div>
              </div>

              {/* Right details rail */}
              <div className="flex flex-col gap-4 overflow-y-auto h-full pr-1">
                <div className="card p-4 shrink-0">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-3">
                    Telephony Details
                  </div>
                  <dl className="space-y-2 text-[12.5px] leading-relaxed">
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Outcome</dt>
                      <dd className="font-semibold capitalize text-ink">
                        {selectedCall.outcome || "Completed"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Direction</dt>
                      <dd className="text-ink capitalize">{selectedCall.direction}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Status</dt>
                      <dd className="text-ink capitalize">{selectedCall.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Latency</dt>
                      <dd className="text-ink">
                        {selectedCall.latencyMs ? `${(selectedCall.latencyMs / 1000).toFixed(2)}s` : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Interruptions</dt>
                      <dd className="text-ink">{selectedCall.interruptions}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Sid</dt>
                      <dd className="text-ink-muted text-[10px] truncate max-w-[130px]" title={selectedCall.callSid}>
                        {selectedCall.callSid}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="card p-4 shrink-0">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-3 flex items-center gap-1.5">
                    <I.Sparkle width={12} height={12} className="text-teal-400" /> AI Lead Insights
                  </div>
                  {convoLoading ? (
                    <div className="space-y-3 p-2">
                      <div className="h-4 bg-surface-2 rounded w-1/2 animate-pulse" />
                      <div className="h-6 bg-surface-2 rounded animate-pulse" />
                      <div className="h-4 bg-surface-2 rounded w-2/3 animate-pulse" />
                    </div>
                  ) : (
                    <dl className="space-y-3 text-[12.5px] leading-relaxed">
                      <div>
                        <dt className="text-ink-muted">Intent Score</dt>
                        <dd className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {selectedConvo?.lead?.intent || "General inquiry"}
                        </dd>
                      </div>
                      {selectedConvo?.lead?.aiNote && (
                        <div>
                          <dt className="text-ink-muted">Conversation Summary</dt>
                          <dd className="italic text-ink-muted text-[12px] leading-snug mt-1">
                            “{selectedConvo.lead.aiNote}”
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-ink-muted font-bold mt-2">Captured Info</dt>
                        <dd className="mt-1.5 space-y-1.5">
                          {selectedConvo?.lead ? (
                            <>
                              {selectedConvo.lead.name && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold bg-mint-100 text-emerald-800 px-1 py-0.25 rounded shrink-0">
                                    Name
                                  </span>
                                  <span className="truncate text-ink font-semibold">
                                    {selectedConvo.lead.name}
                                  </span>
                                </div>
                              )}
                              {selectedConvo.lead.email && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold bg-mint-100 text-emerald-800 px-1 py-0.25 rounded shrink-0">
                                    Email
                                  </span>
                                  <span className="truncate text-ink font-semibold" title={selectedConvo.lead.email}>
                                    {selectedConvo.lead.email}
                                  </span>
                                </div>
                              )}
                              {selectedConvo.lead.phone && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold bg-mint-100 text-emerald-800 px-1 py-0.25 rounded shrink-0">
                                    Phone
                                  </span>
                                  <span className="text-ink font-semibold">
                                    {selectedConvo.lead.phone}
                                  </span>
                                </div>
                              )}
                              {!selectedConvo.lead.name &&
                                !selectedConvo.lead.email &&
                                !selectedConvo.lead.phone && (
                                  <span className="text-ink-muted italic">No profile info captured</span>
                                )}
                            </>
                          ) : (
                            <span className="text-ink-muted italic">No profile info captured</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Outbound Dialer Modal */}
      <OutboundDialerModal
        isOpen={dialerOpen}
        onClose={() => setDialerOpen(false)}
        onCallInitiated={() => {
          fetchCalls();
        }}
      />

      {/* New Campaign Wizard Modal */}
      <NewCampaignModal
        isOpen={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        onCampaignCreated={() => {
          fetchCampaigns();
          setActiveTab("campaigns");
        }}
      />

      <GModal
        open={!!campaignError}
        onClose={() => setCampaignError(null)}
        title="Campaign Error"
      >
        <div className="p-4">
          <p className="text-[13px] text-ink-muted">{campaignError}</p>
          <div className="mt-4 flex justify-end">
            <button className="g-btn" onClick={() => setCampaignError(null)}>
              OK
            </button>
          </div>
        </div>
      </GModal>

      <GModal
        open={!!campaignToCancel}
        onClose={() => setCampaignToCancel(null)}
        title="Cancel Campaign"
      >
        <div className="p-4">
          <p className="text-[13px] text-ink-muted">Are you sure you want to cancel this campaign?</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="g-btn-2" onClick={() => setCampaignToCancel(null)}>
              Keep Running
            </button>
            <button className="g-btn !bg-red-600 hover:!bg-red-700 !border-red-700 text-[#ffffff]" onClick={() => campaignToCancel && handleCancelCampaign(campaignToCancel)}>
              Cancel Campaign
            </button>
          </div>
        </div>
      </GModal>
    </>
  );
}

