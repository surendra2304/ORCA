import asyncio
import logging
from typing import Any, Dict, List

from app.graph.agents import AGENT_REGISTRY
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector

logger = logging.getLogger(__name__)


async def executor_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Executor LangGraph node.
    Iterates sequentially through execution_plan batches, executing agents within
    each batch concurrently using asyncio.gather.
    Passes the TraceCollector into each agent.run() so events are emitted live.
    Successful payloads are accumulated in agent_outputs; errors are omitted.
    """
    execution_plan: List[List[str]] = state.get("execution_plan", [])
    agent_outputs: Dict[str, Any] = dict(state.get("agent_outputs") or {})

    for batch_idx, batch in enumerate(execution_plan):
        logger.info("Executing batch %d with agents: %s", batch_idx, batch)

        agent_names: List[str] = []
        coroutines = []

        for name in batch:
            agent = AGENT_REGISTRY.get(name)
            if agent:
                agent_names.append(name)
                # Pass current state (including outputs from previous batches)
                current_batch_state = {**state, "agent_outputs": agent_outputs}
                coroutines.append(agent.run(collector, current_batch_state))
            else:
                logger.warning("Agent '%s' in batch %d not found in AGENT_REGISTRY", name, batch_idx)
                await collector.emit(
                    "error",
                    name,
                    {"error": f"Agent '{name}' is not registered in ORCA"},
                )

        if coroutines:
            results = await asyncio.gather(*coroutines)
            for name, payload in zip(agent_names, results):
                if payload.get("status") != "error":
                    agent_outputs[name] = payload
                else:
                    logger.warning("Agent '%s' failed; omitting from agent_outputs", name)

        # Update state["agent_outputs"] in-place for subsequent batches
        state["agent_outputs"] = agent_outputs

    return {
        "agent_outputs": agent_outputs,
    }
