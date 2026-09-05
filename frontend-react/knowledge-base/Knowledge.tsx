import { useEffect, useState } from "react";
import { PageHead, Loading, GModal } from "../components/grok";
import * as I from "../components/icons";
import { api } from "../lib/api";

interface DocSource {
  id: string;
  type: string;
  name: string;
  status: string;
  chunkCount: number;
  pct: number;
  updatedAt: string;
  error?: string | null;
}

interface KbMetrics {
  sources: number;
  ready: number;
  topicsApprox: number;
  lastTrainedAt: string;
}

const typeIcon: Record<string, string> = {
  PDF: "📄",
  TXT: "📝",
  DOC: "📑",
  DOCX: "📑",
  XLSX: "📊",
  CSV: "📊",
  PPTX: "📊",
  PPT: "📊",
  RTF: "📄",
  MD: "📝",
  FAQ: "❓",
  URL: "🔗",
};

const getTypeIcon = (type: string) => {
  const icon = typeIcon[type];
  if (icon) {
    return <span className="text-[16px] leading-none opacity-80">{icon}</span>;
  }
  return <I.FileText width={18} height={18} className="text-[var(--g-muted-foreground)]" />;
};
const statusStyle: Record<string, string> = {
  ready: "!bg-emerald-50 !text-emerald-700 !border-emerald-200/80 font-semibold",
  processing: "!bg-blue-50 !text-blue-700 !border-blue-200/80 font-medium",
  failed: "!bg-red-50 !text-red-700 !border-red-200/80 font-medium",
};

let kbDocsCache: DocSource[] | null = (() => {
  try {
    const s = sessionStorage.getItem("kaligan_kb_docs");
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
})();

let kbMetricsCache: KbMetrics | null = (() => {
  try {
    const s = sessionStorage.getItem("kaligan_kb_metrics");
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
})();

export default function Knowledge() {
  const [sources, setSources] = useState<DocSource[]>(() => kbDocsCache || []);
  const [metrics, setMetrics] = useState<KbMetrics | null>(() => kbMetricsCache || null);
  const [loading, setLoading] = useState(() => !kbDocsCache);
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"file" | "url" | "faq">("file");

  // Form states
  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [faqName, setFaqName] = useState("");
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([{ q: "", a: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      const docs = await api.get("/kb/documents");
      kbDocsCache = docs || [];
      try {
        sessionStorage.setItem("kaligan_kb_docs", JSON.stringify(docs || []));
      } catch (e) {}
      setSources(docs || []);
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const data = await api.get("/kb/status");
      kbMetricsCache = data;
      try {
        sessionStorage.setItem("kaligan_kb_metrics", JSON.stringify(data));
      } catch (e) {}
      setMetrics(data);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  };

  // Initial fetch with parallel execution
  useEffect(() => {
    const loadInit = async () => {
      await Promise.all([fetchSources(), fetchMetrics()]);
      setLoading(false);
    };
    loadInit();
  }, []);

  // Poll while any document is processing
  useEffect(() => {
    const isProcessing = sources.some(s => s.status === "processing");
    if (!isProcessing) return;

    const interval = setInterval(() => {
      fetchSources();
      fetchMetrics();
    }, 3000);

    return () => clearInterval(interval);
  }, [sources]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this source? All associated vector chunks will be permanently removed.")) return;
    
    // Optimistic delete: immediately remove from UI in 0ms!
    const previous = sources;
    const nextSources = sources.filter(s => s.id !== id);
    setSources(nextSources);
    kbDocsCache = nextSources;
    try {
      sessionStorage.setItem("kaligan_kb_docs", JSON.stringify(nextSources));
    } catch (e) {}

    try {
      await api.del(`/kb/documents/${id}`);
      fetchMetrics();
    } catch (err: any) {
      setSources(previous);
      kbDocsCache = previous;
      try {
        sessionStorage.setItem("kaligan_kb_docs", JSON.stringify(previous));
      } catch (e) {}
      alert(err.message || "Failed to delete document.");
    }
  };

  const handleRetry = async (id: string) => {
    // Optimistic retry: immediately mark as processing
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: "processing", error: null, pct: 0 } : s));
    try {
      await api.post(`/kb/documents/${id}/retry`);
      fetchSources();
    } catch (err: any) {
      alert(err.message || "Failed to retry ingestion.");
      fetchSources();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (sourceType === "file") {
        if (!fileInput) throw new Error("Please select a file to upload.");
        await api.upload("/kb/documents", fileInput);
      } else if (sourceType === "url") {
        if (!urlInput.trim()) throw new Error("Please enter a URL.");
        await api.post("/kb/documents", {
          type: "url",
          url: urlInput.trim(),
          name: urlName.trim() || undefined,
        });
      } else if (sourceType === "faq") {
        const validItems = faqItems.filter(item => item.q.trim() && item.a.trim());
        if (validItems.length === 0) throw new Error("Please fill in at least one Q&A pair.");
        await api.post("/kb/documents", {
          type: "faq",
          name: faqName.trim() || undefined,
          items: JSON.stringify(validItems),
        });
      }

      // Reset states and close modal
      setUrlInput("");
      setUrlName("");
      setFileInput(null);
      setFaqName("");
      setFaqItems([{ q: "", a: "" }]);
      setModalOpen(false);
      
      // Refresh list
      fetchSources();
      fetchMetrics();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to ingest source.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatUpdateDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const handleFaqChange = (idx: number, field: "q" | "a", value: string) => {
    const newItems = [...faqItems];
    newItems[idx][field] = value;
    setFaqItems(newItems);
  };

  const addFaqField = () => setFaqItems([...faqItems, { q: "", a: "" }]);
  const removeFaqField = (idx: number) => setFaqItems(faqItems.filter((_, i) => i !== idx));

  return (
    <>
      <PageHead
        title="Knowledge Base"
        subtitle="The source of your AI's intelligence — files, FAQs, and pages it learns from."
        right={
          <button className="g-btn" onClick={() => setModalOpen(true)}>
            <I.Plus width={14} height={14} /> <span>Add source</span>
          </button>
        }
      />

      {metrics && (
        <div className="flex items-center gap-2.5 g-card p-3.5 text-[13.5px] text-[var(--g-foreground)] font-medium mb-4 fadeup">
          <I.Sparkle width={16} height={16} /> Your AI knows ~{metrics.topicsApprox} topics from {metrics.sources} source{metrics.sources !== 1 ? "s" : ""} · last trained {formatUpdateDate(metrics.lastTrainedAt)}
        </div>
      )}

      {loading ? (
        <div className="py-16">
          <Loading label="Loading knowledge base" subtitle="Syncing documents and vector topics" />
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 g-card p-8 fadeup">
          <span className="w-12 h-12 rounded-2xl bg-[var(--g-surface-2)] text-[var(--g-foreground)] border border-[var(--g-border)] grid place-items-center mx-auto mb-4">
            <I.Book width={24} height={24} />
          </span>
          <h3 className="font-display text-lg font-bold">No knowledge sources</h3>
          <p className="text-ink-muted text-sm mt-1 max-w-sm mx-auto">
            Upload policies, paste Q&As, or link webpage documentation so your AI can answer visitors.
          </p>
          <button className="g-btn mt-5" onClick={() => setModalOpen(true)}>
            Add your first source
          </button>
        </div>
      ) : (
        <div className="g-card fadeup overflow-hidden">
          {sources.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-line" : ""} hover:bg-[var(--g-surface-2)] transition-colors duration-150 ease-out`}>
              <span className="shrink-0">{getTypeIcon(s.type.toUpperCase())}</span>
              <span className="flex-1 min-w-0">
                <b className="font-semibold text-sm block truncate">{s.name}</b>
                {s.status === "failed" && (
                  <small className="block text-red-600 text-[12.5px] mt-0.5 font-medium">
                    {s.error || "Failed to parse content."}
                  </small>
                )}
                {s.status === "ready" && (
                  <small className="block text-ink-muted text-[12px] mt-0.5">
                    {s.chunkCount} vector chunks generated
                  </small>
                )}
              </span>
              <span className={`g-pill ${statusStyle[s.status] || "g-pill-muted"}`}>
                {s.status === "processing" ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Processing {s.pct}%</span>
                  </>
                ) : s.status === "ready" ? (
                  <>
                    <span className="g-pill-live-dot" />
                    <span>Synced</span>
                  </>
                ) : (
                  <>
                    <span className="g-pill-offline-dot" />
                    <span>Failed</span>
                  </>
                )}
              </span>
              <span className="text-ink-muted text-[12.5px] w-20 text-right">{formatUpdateDate(s.updatedAt)}</span>
              <div className="flex items-center gap-2">
                {s.status === "failed" ? (
                  <button onClick={() => handleRetry(s.id)} className="g-btn-2 !py-1.5 !px-4 text-[13px]">
                    Retry
                  </button>
                ) : (
                  <button onClick={() => handleDelete(s.id)} className="text-ink-muted hover:text-red-600 transition px-2 py-1">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <GModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSubmitError(null);
        }}
        title="Add knowledge source"
      >
        <div className="flex gap-4 mb-5 border-b border-[var(--g-border-light)]">
          {(["file", "url", "faq"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setSourceType(tab);
                setSubmitError(null);
              }}
              className={`text-[13px] font-semibold py-2 transition border-b-2 -mb-[1px] ${
                sourceType === tab 
                  ? "border-[var(--g-foreground)] text-[var(--g-foreground)]" 
                  : "border-transparent text-[var(--g-muted-foreground)] hover:text-[var(--g-foreground)]"
              }`}
            >
              {tab === "file" ? "Upload File" : tab === "url" ? "Web URL" : "FAQ Q&As"}
            </button>
          ))}
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[12.5px] font-medium leading-relaxed">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {sourceType === "file" && (
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[var(--g-foreground)] mb-1">File (PDF, DOCX, XLSX, PPTX, CSV, TXT, MD under 10MB)</label>
              <input
                required
                type="file"
                accept=".pdf,.txt,.doc,.docx,.md,.rtf,.csv,.xlsx,.xls,.pptx,.ppt"
                onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                className="w-full text-[13px] text-[var(--g-muted-foreground)] border border-dashed border-[var(--g-border)] rounded-xl p-6 text-center cursor-pointer hover:border-[#bfbfbf] transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-[var(--g-surface-2)] file:text-[var(--g-foreground)] hover:file:bg-[var(--g-border)]"
              />
              {fileInput && (
                <div className="text-[12.5px] font-semibold text-[var(--g-foreground)] mt-2">
                  Selected: {fileInput.name} ({(fileInput.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}

          {sourceType === "url" && (
            <>
              <div className="mb-3">
                <label className="block text-[12px] font-semibold text-[var(--g-foreground)] mb-1">Source name (optional)</label>
                <input
                  className="w-full text-[13px] px-3.5 py-2 rounded-xl border border-[var(--g-border)] bg-[#ffffff] outline-none focus:border-[var(--g-foreground)]"
                  placeholder="Pricing info, refund policy..."
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-[var(--g-foreground)] mb-1">Webpage URL</label>
                <input
                  required
                  type="url"
                  className="w-full text-[13px] px-3.5 py-2 rounded-xl border border-[var(--g-border)] bg-[#ffffff] outline-none focus:border-[var(--g-foreground)]"
                  placeholder="https://acme.com/pricing"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
            </>
          )}

          {sourceType === "faq" && (
            <>
              <div className="mb-3">
                <label className="block text-[12px] font-semibold text-[var(--g-foreground)] mb-1">FAQ Name (optional)</label>
                <input
                  className="w-full text-[13px] px-3.5 py-2 rounded-xl border border-[var(--g-border)] bg-[#ffffff] outline-none focus:border-[var(--g-foreground)]"
                  placeholder="General FAQ, Support FAQs..."
                  value={faqName}
                  onChange={(e) => setFaqName(e.target.value)}
                />
              </div>
              <div className="max-h-[220px] overflow-y-auto mb-4 pr-1">
                <label className="block text-[12px] font-semibold text-[var(--g-foreground)] mb-1">FAQ Q&A Pairs</label>
                {faqItems.map((item, idx) => (
                  <div key={idx} className="mb-3 border border-[var(--g-border)] rounded-xl p-3 bg-[var(--g-surface)] relative">
                    {faqItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFaqField(idx)}
                        className="absolute top-2 right-2 text-[12px] text-[var(--g-muted-foreground)] hover:text-red-600 transition"
                      >
                        Remove
                      </button>
                    )}
                    <input
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--g-border)] bg-[#ffffff] outline-none focus:border-[var(--g-foreground)] text-[13px] mb-2"
                      placeholder="Question"
                      value={item.q}
                      onChange={(e) => handleFaqChange(idx, "q", e.target.value)}
                    />
                    <textarea
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--g-border)] bg-[#ffffff] outline-none focus:border-[var(--g-foreground)] text-[13px] min-h-[60px] resize-none"
                      placeholder="Answer"
                      value={item.a}
                      onChange={(e) => handleFaqChange(idx, "a", e.target.value)}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFaqField}
                  className="g-btn-2 w-full !py-1.5 text-[12px] font-semibold"
                >
                  + Add Question
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="g-btn text-[13px] h-[36px] w-full flex items-center justify-center gap-2 mt-2 font-semibold shadow-xs"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-[#ffffff] border-t-transparent rounded-full animate-spin" />
                <span>Ingesting knowledge...</span>
              </>
            ) : (
              "Ingest Source"
            )}
          </button>
        </form>
      </GModal>
    </>
  );
}

