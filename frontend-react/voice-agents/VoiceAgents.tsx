import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHead, Loading } from "../components/grok";
import * as I from "../components/icons";
import { api } from "../lib/api";
import type { Agent } from "../types/agent";

import { getCached, setCached } from "../lib/cache";

export default function VoiceAgents() {
  const [agents, setAgents] = useState<Agent[]>(() => getCached("voiceAgentsCache") || []);
  const [loading, setLoading] = useState(() => !getCached("voiceAgentsCache"));
  const navigate = useNavigate();

  const fetchAgents = async () => {
    try {
      const data = await api.get("/agents?kind=voice");
      setCached("voiceAgentsCache", data || []);
      setAgents(data || []);
    } catch (err) {
      console.error("Failed to load voice agents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async () => {
    try {
      const newAgent = await api.post("/agents", {
        kind: "voice",
        name: "Sales Voice Agent",
        voiceName: "aria",
        persona: "Friendly",
        greeting: "Hi, thanks for calling! How can I help you today?",
        goal: "qualify",
        captureFields: ["name", "email"],
      });
      navigate(`/app/voice/${newAgent.id}`);
    } catch (err) {
      console.error("Failed to create voice agent:", err);
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="py-24">
        <Loading label="Loading voice agents" subtitle="Retrieving configured voices and channels" />
      </div>
    );
  }

  return (
    <>
      <PageHead
        title="Voice Agents"
        subtitle="Build AI agents that talk to callers — using your knowledge base."
        right={
          <button onClick={handleCreateAgent} className="btn btn-primary">
            <I.Plus width={15} height={15} /> New voice agent
          </button>
        }
      />
      <div className="grid grid-cols-3 gap-4">
        {agents.map((v) => (
          <Link
            key={v.id}
            to={`/app/voice/${v.id}`}
            className="card p-5 hover:-translate-y-0.5 hover:shadow-lift hover:border-mint-300 transition block fadeup"
          >
            <div className="flex items-center justify-between">
              <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
                <I.Mic width={20} height={20} />
              </span>
              <span
                className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${
                  v.status === "live" ? "bg-emerald-50 text-success" : "bg-[#f0efe2] text-ink-muted"
                }`}
              >
                {v.status === "live" ? "● Live" : "Draft"}
              </span>
            </div>
            <h3 className="font-display text-[17px] font-bold mt-3.5">{v.name}</h3>
            <p className="text-ink-muted text-[13px] mt-1">
              Voice: {v.voiceName || "Vani"} · {v.status === "live" ? "1" : "0"} channels
            </p>
            <div className="border-t border-line mt-4 pt-3 text-[13px] text-ink-muted">
              Calls handled: 0
            </div>
          </Link>
        ))}
        <button
          onClick={handleCreateAgent}
          className="rounded-xl2 border-2 border-dashed border-line grid place-items-center text-ink-muted hover:border-mint-300 hover:text-emerald-600 transition min-h-[180px] w-full text-center"
        >
          <span className="flex flex-col items-center gap-2">
            <I.Plus /> <span className="text-sm font-semibold">New voice agent</span>
          </span>
        </button>
      </div>
    </>
  );
}
