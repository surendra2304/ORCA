import asyncio
import logging
from typing import Any, Dict, List

from app.graph.agents import AGENT_REGISTRY
from app.graph.state import ORCAState, create_event

logger = logging.getLogger(__name__)


async def executor_node(state: ORCAState) -> Dict[str, Any]:
    """
    Executor LangGraph node.
    Iterates sequentially through execution_plan batches, executing agents within
    each batch concurrently using asyncio.gather.
    Successful payloads are accumulated in agent_outputs; errors are recorded in trace
    and omitted from agent_outputs.
    """
    execution_plan: List[List[str]] = state.get("execution_plan", [])
    agent_outputs: Dict[str, Any] = dict(state.get("agent_outputs") or {})
    all_events: List[Dict[str, Any]] = []

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
                coroutines.append(agent.run(current_batch_state))
            else:
                logger.warning("Agent '%s' in batch %d not found in AGENT_REGISTRY", name, batch_idx)
                err_event = create_event(
                    "error",
                    agent=name,
                    data={"error": f"Agent '{name}' is not registered in ORCA"},
                )
                all_events.append(err_event)

        if coroutines:
            results = await asyncio.gather(*coroutines)
            for name, (payload, events) in zip(agent_names, results):
                all_events.extend(events)
                if payload.get("status") != "error":
                    agent_outputs[name] = payload
                else:
                    logger.warning("Agent '%s' failed; omitting from agent_outputs", name)

        # Update state["agent_outputs"] in-place for subsequent batches
        state["agent_outputs"] = agent_outputs

    return {
        "agent_outputs": agent_outputs,
        "trace": all_events,
    }
