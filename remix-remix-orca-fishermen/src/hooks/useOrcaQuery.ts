/**
 * useOrcaQuery — React hook for sending queries to the ORCA multi-agent API
 * and streaming real-time trace events back to the UI.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  sendQuery,
  sendQuerySync,
  streamRun,
  type AgentOutputs,
  type VerdictData,
  type SSEEnvelope,
  type SyncQueryResponse,
} from '../services/orcaApi';

// Re-export VerdictData for components
export type { VerdictData } from '../services/orcaApi';

export interface OrcaTraceStep {
  type: string;
  ts: string;
  agent?: string;
  label: string;
  detail?: string;
}

export interface OrcaQueryState {
  loading: boolean;
  streaming: boolean;
  done: boolean;
  error: string | null;
  sessionId: string | null;
  runId: string | null;
  finalAnswer: string | null;
  verdict: VerdictData | null;
  agentOutputs: AgentOutputs | null;
  traceSteps: OrcaTraceStep[];
}

const initialState: OrcaQueryState = {
  loading: false,
  streaming: false,
  done: false,
  error: null,
  sessionId: null,
  runId: null,
  finalAnswer: null,
  verdict: null,
  agentOutputs: null,
  traceSteps: [],
};

function envelopeToTraceStep(env: SSEEnvelope): OrcaTraceStep | null {
  const p = env.payload || {};
  const agent = env.agent || p.agent || undefined;
  
  switch (env.type) {
    case 'run_started':
      return { type: env.type, ts: env.ts, label: '🚀 Query received', detail: String(p.query || '') };
    case 'plan_created':
      return {
        type: env.type, ts: env.ts, label: '🧠 Planning agents',
        detail: Array.isArray(p.needed_agents)
          ? `Agents: ${(p.needed_agents as string[]).join(', ')}`
          : undefined,
      };
    case 'agent_started':
      return {
        type: env.type, ts: env.ts, agent: String(agent || ''),
        label: `🔍 ${String(agent || 'Agent')} started`,
      };
    case 'tool_called':
      return {
        type: env.type, ts: env.ts, agent: String(agent || ''),
        label: `🔧 ${String(agent || 'Agent')} calling ${String(p.tool || 'tool')}`,
      };
    case 'agent_result':
      return {
        type: env.type, ts: env.ts, agent: String(agent || ''),
        label: `✅ ${String(agent || 'Agent')} done`,
        detail: String(p.summary || '').slice(0, 100),
      };
    case 'reflection':
      return {
        type: env.type, ts: env.ts, label: '🪞 Reflection check',
        detail: String(p.reason || ''),
      };
    case 'verdict':
      return {
        type: env.type, ts: env.ts, label: `⚖️ Safety verdict: ${String(p.label || '')}`,
        detail: String(p.summary || ''),
      };
    case 'final_answer':
      return { type: env.type, ts: env.ts, label: '✍️ Answer ready' };
    case 'run_complete':
      return { type: env.type, ts: env.ts, label: '🏁 Run complete' };
    case 'error':
      return { type: env.type, ts: env.ts, label: `❌ Error: ${String(p.message || '')}` };
    default:
      return null;
  }
}

/**
 * Async streaming mode — sends query, gets run_id, subscribes to SSE stream.
 * Best for chat UI where you want to show live progress.
 */
export function useOrcaQuery(sessionIdRef?: React.MutableRefObject<string | null>) {
  const [state, setState] = useState<OrcaQueryState>(initialState);
  const cleanupRef = useRef<(() => void) | null>(null);

  const ask = useCallback(
    async (text: string, language = 'en', vesselClass = 'small_fishing_boat') => {
      // Cancel any in-progress stream
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      setState({ ...initialState, loading: true });

      try {
        const resp = await sendQuery({
          text,
          language,
          vessel_class: vesselClass,
          session_id: sessionIdRef?.current ?? undefined,
          mode: 'real',
          lat: 17.6868,
          lon: 83.2185,
          location_name: 'Visakhapatnam Harbor',
        });

        // Persist session_id for multi-turn conversations
        if (sessionIdRef) sessionIdRef.current = resp.session_id;

        setState((prev) => ({
          ...prev,
          loading: false,
          streaming: true,
          sessionId: resp.session_id,
          runId: resp.run_id,
        }));

        // Subscribe to SSE
        cleanupRef.current = streamRun(
          resp.run_id,
          (envelope) => {
            const step = envelopeToTraceStep(envelope);

            setState((prev) => {
              const newState = { ...prev };
              if (step) newState.traceSteps = [...prev.traceSteps, step];

              // Extract final answer
              if (envelope.type === 'final_answer') {
                newState.finalAnswer = String(envelope.payload?.text || envelope.payload?.answer || '');
              }

              // Extract verdict
              if (envelope.type === 'verdict') {
                newState.verdict = envelope.payload as unknown as VerdictData;
              }

              // Accumulate agent outputs from agent_result events
              if (envelope.type === 'agent_result' && envelope.agent) {
                const currentOutputs = prev.agentOutputs || {};
                newState.agentOutputs = {
                  ...currentOutputs,
                  [envelope.agent]: envelope.payload,
                } as AgentOutputs;
              }

              return newState;
            });
          },
          () => {
            setState((prev) => ({ ...prev, streaming: false, done: true }));
            cleanupRef.current = null;
          },
          () => {
            setState((prev) => ({
              ...prev,
              streaming: false,
              done: true,
              error: 'Lost connection to ORCA. Please try again.',
            }));
          },
        );
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          streaming: false,
          error: err instanceof Error ? err.message : 'Failed to reach ORCA API.',
        }));
      }
    },
    [sessionIdRef],
  );

  const reset = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setState(initialState);
  }, []);

  return { ...state, ask, reset };
}

/**
 * Sync mode — fires a query and waits for the full result.
 * Best for dashboard pre-loading (sea conditions on mount).
 */
export function useOrcaSyncQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncQueryResponse | null>(null);

  const fetch = useCallback(async (text: string, language = 'en') => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await sendQuerySync({ text, language, mode: 'real' });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach ORCA API.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, fetch };
}
