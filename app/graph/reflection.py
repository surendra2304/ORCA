"""
Bounded Reflection / Mentor Pattern (Phase 8B):
Provides single-pass structural self-reflection between executor and verdict.
Analyzes observation sufficiency using deterministic R-rules and an optional LLM critic.
If deficiencies or failed agents are detected, triggers a single bounded replan.
Guaranteed structural single-invocation: no recursive cycles, no counters needed.

Reference: arXiv:2404.18074 - Mentor: A Self-Reflection Architecture for Multi-Agent Systems
"""

import asyncio
import logging
from typing import Any, Dict, List, Set, Tuple

from app.config import settings
from app.graph.agents import AGENT_REGISTRY
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.llm import call_llm_json

logger = logging.getLogger(__name__)

from app.graph.agents import VALID_AGENTS


def analyze_sufficiency(state: ORCAState) -> Tuple[bool, List[str], List[str], str]:
    """
    Deterministic sufficiency analyzer implementing core R-rules:
    - R1 (Failed agent retry): Any agent in needed_agents missing from agent_outputs
      or having status=='error' must be retried.
    - R2 (Safety critical core dependency): For safety-relevant queries, core marine
      agents (weather, ocean) must be present and successful.
    - R3 (Conditional escalation): If hazard agent reports high-severity alerts and
      geospatial was not executed, add geospatial to additional_agents.

    Returns:
        (is_sufficient, retry_agents, additional_agents, reason)
    """
    needed_agents: List[str] = list(state.get("needed_agents") or [])
    agent_outputs: Dict[str, Any] = state.get("agent_outputs") or {}
    safety_relevant: bool = state.get("safety_relevant", True)

    retry_agents: List[str] = []
    additional_agents: List[str] = []

    # Rule R1: Detect failed or missing needed agents
    for agent_name in needed_agents:
        if agent_name not in agent_outputs:
            retry_agents.append(agent_name)
        else:
            payload = agent_outputs[agent_name]
            if isinstance(payload, dict) and payload.get("status") == "error":
                retry_agents.append(agent_name)

    # Rule R2: Safety critical core dependencies
    if safety_relevant:
        for core in ("weather", "ocean"):
            if core in needed_agents and core not in retry_agents:
                if core not in agent_outputs or agent_outputs[core].get("status") == "error":
                    retry_agents.append(core)

    # Rule R3: Escalation for active high severity hazards
    if "hazard" in agent_outputs and "geospatial" not in needed_agents:
        hazard_data = agent_outputs["hazard"]
        if isinstance(hazard_data, dict):
            alerts = hazard_data.get("alerts", [])
            has_high_hazard = any(
                isinstance(a, dict) and a.get("severity") in ("high", "severe", "extreme")
                for a in alerts
            )
            if has_high_hazard:
                additional_agents.append("geospatial")

    # Deduplicate while preserving order
    retry_agents = list(dict.fromkeys(retry_agents))
    additional_agents = [a for a in dict.fromkeys(additional_agents) if a not in needed_agents]

    is_sufficient = (len(retry_agents) == 0 and len(additional_agents) == 0)

    if is_sufficient:
        reason = "All required observations successfully gathered"
    else:
        reasons = []
        if retry_agents:
            reasons.append(f"Retry required for failed agents: {', '.join(retry_agents)}")
        if additional_agents:
            reasons.append(f"Additional observations required: {', '.join(additional_agents)}")
        reason = "; ".join(reasons)

    return is_sufficient, retry_agents, additional_agents, reason


async def run_reflection_critic(state: ORCAState) -> Dict[str, Any]:
    """
    Optional LLM Critic validating observation completeness.
    Called ONLY when settings.REFLECTION_LLM_CRITIC is True.
    When disabled, performs zero LLM calls.

    Discipline:
    - Discards any agent not in VALID_AGENTS.
    - NO REMOVAL PATH: Critic can only suggest additions or retries; removals are strictly ignored.
    """
    if not settings.REFLECTION_LLM_CRITIC:
        return {
            "critic_used": False,
            "retry_agents": [],
            "additional_agents": [],
            "reason": "",
        }

    query = state.get("query", "")
    entities = state.get("entities", {})
    needed = state.get("needed_agents", [])
    outputs = state.get("agent_outputs", {})

    system_prompt = (
        "You are an expert marine safety reflection critic in the ORCA decision support architecture. "
        "Review the user query, entities, requested agents, and observation summaries. "
        "Determine if any additional agents should be run or any agent retried. "
        f"Valid agents are strictly: {', '.join(sorted(VALID_AGENTS))}. "
        "You may ONLY suggest additions or retries. You have NO permission to remove any agent. "
        "Respond with valid JSON: {\"additional_agents\": [...], \"retry_agents\": [...], \"reason\": \"...\"}."
    )

    user_prompt = (
        f"User Query: {query}\n"
        f"Entities: {entities}\n"
        f"Current Needed Agents: {needed}\n"
        f"Completed Agent Outputs: {list(outputs.keys())}\n"
    )

    try:
        data = await call_llm_json(system_prompt, user_prompt)
        raw_adds = data.get("additional_agents", []) if isinstance(data, dict) else []
        raw_retries = data.get("retry_agents", []) if isinstance(data, dict) else []
        reason = str(data.get("reason", "")) if isinstance(data, dict) else ""

        # Filter: keep only known valid agents and enforce addition/retry semantics
        valid_adds = [
            a for a in raw_adds
            if isinstance(a, str) and a in VALID_AGENTS and a not in needed
        ]
        valid_retries = [
            a for a in raw_retries
            if isinstance(a, str) and a in VALID_AGENTS and a in needed
        ]

        return {
            "critic_used": True,
            "retry_agents": valid_retries,
            "additional_agents": valid_adds,
            "reason": reason,
        }
    except Exception as exc:
        logger.warning("Reflection LLM critic call failed: %s", exc)
        return {
            "critic_used": True,
            "retry_agents": [],
            "additional_agents": [],
            "reason": f"Critic error: {exc}",
        }


async def reflection_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Reflection LangGraph Node.
    Executes deterministic R-rules and optional critic.
    Emits the 'reflection' trace event.
    """
    r_sufficient, r_retries, r_adds, r_reason = analyze_sufficiency(state)

    critic_used = False
    c_retries: List[str] = []
    c_adds: List[str] = []
    c_reason = ""

    if settings.REFLECTION_LLM_CRITIC:
        critic_res = await run_reflection_critic(state)
        critic_used = critic_res.get("critic_used", False)
        c_retries = critic_res.get("retry_agents", [])
        c_adds = critic_res.get("additional_agents", [])
        c_reason = critic_res.get("reason", "")

    # Combine R-rules and valid critic suggestions (R-rules are never overridden)
    final_retries = list(dict.fromkeys(r_retries + c_retries))
    final_adds = list(dict.fromkeys(r_adds + c_adds))
    sufficient = (len(final_retries) == 0 and len(final_adds) == 0)

    if sufficient:
        final_reason = "All required observations successfully gathered"
    else:
        reasons = []
        if r_reason and not r_sufficient:
            reasons.append(r_reason)
        if c_reason and (c_retries or c_adds):
            reasons.append(f"Critic: {c_reason}")
        final_reason = "; ".join(reasons) if reasons else "Deficiencies detected; replanning required"

    reflection_payload = {
        "sufficient": sufficient,
        "retry_agents": final_retries,
        "additional_agents": final_adds,
        "reason": final_reason,
        "critic_used": critic_used,
    }

    # Emit reflection event
    await collector.emit("reflection", None, reflection_payload)

    return {
        "reflection": reflection_payload,
    }


def should_replan(state: ORCAState) -> str:
    """
    Conditional edge router from reflection node:
    - Returns 'verdict' if reflection determined execution is sufficient.
    - Returns 'replan' if deficiencies/retries are required.
    """
    refl = state.get("reflection") or {}
    if refl.get("sufficient") is True:
        return "verdict"
    return "replan"


async def replan_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Replan LangGraph Node.
    Formulates a targeted execution batch for failed or newly added agents.
    Emits the 'replan' trace event.
    """
    reflection = state.get("reflection") or {}
    retry_agents: List[str] = reflection.get("retry_agents") or []
    additional_agents: List[str] = reflection.get("additional_agents") or []

    agents_to_run = list(dict.fromkeys(retry_agents + additional_agents))
    new_plan: List[List[str]] = [agents_to_run] if agents_to_run else []

    replan_payload = {
        "retry_agents": retry_agents,
        "additional_agents": additional_agents,
        "new_plan": new_plan,
        "reason": reflection.get("reason", "Replanning to resolve deficiencies"),
    }

    # Emit replan event
    await collector.emit("replan", None, replan_payload)

    updated_needed = list(dict.fromkeys((state.get("needed_agents") or []) + additional_agents))

    return {
        "replan": replan_payload,
        "replan_execution_plan": new_plan,
        "needed_agents": updated_needed,
    }


async def executor_replan_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Second-pass Executor Node.
    Executes the targeted replan batches concurrently.
    Updates agent_outputs with new successful observations.
    Directly edges to verdict: structurally bounded to at most one replay.
    """
    replan_plan: List[List[str]] = state.get("replan_execution_plan") or []
    agent_outputs: Dict[str, Any] = dict(state.get("agent_outputs") or {})

    for batch_idx, batch in enumerate(replan_plan):
        logger.info("Executing replan batch %d with agents: %s", batch_idx, batch)

        agent_names: List[str] = []
        coroutines = []

        for name in batch:
            agent = AGENT_REGISTRY.get(name)
            if agent:
                agent_names.append(name)
                current_batch_state = {**state, "agent_outputs": agent_outputs}
                coroutines.append(agent.run(collector, current_batch_state))
            else:
                logger.warning("Replan agent '%s' not found in AGENT_REGISTRY", name)

        if coroutines:
            results = await asyncio.gather(*coroutines)
            for name, payload in zip(agent_names, results):
                if payload.get("status") != "error":
                    agent_outputs[name] = payload
                else:
                    logger.warning("Agent '%s' failed on replan pass", name)

    return {
        "agent_outputs": agent_outputs,
    }
