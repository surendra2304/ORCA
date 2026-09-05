import logging
from typing import Any, Dict, List, Tuple

from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.llm.client import call_llm_json

logger = logging.getLogger(__name__)

VALID_AGENTS = {"weather", "ocean", "pfz", "satellite", "geospatial", "hazard"}
CANONICAL_AGENTS = ["weather", "ocean", "pfz", "satellite", "hazard", "geospatial"]

FALLBACK_PLAN = {
    "needed_agents": CANONICAL_AGENTS,
    "execution_plan": [
        ["weather", "ocean", "pfz", "satellite", "hazard"],
        ["geospatial"],
    ],
    "entities": {
        "lat": None,
        "lon": None,
        "location_name": None,
        "date_hint": None,
    },
}

PLANNER_SYSTEM_PROMPT = """You are ORCA Planner, an expert coordinator for marine reasoning in the Indian Ocean.
Analyze the user query, determine the required agents, extract relevant entities, and formulate an execution plan.

Available Agents:
- weather: Meteorological forecast, wind speed, gusts, precipitation, lightning risk.
- ocean: Ocean state forecast, wave heights, swell, sea surface temperature, tides, and currents.
- pfz: Potential Fishing Zone advisories, fish aggregation coordinates, depth, and confidence.
- satellite: Earth observation satellite imagery, chlorophyll-a concentration, SST anomalies.
- geospatial: Navigational distance and bearing calculations from user to PFZ zones and coastal ports.
- hazard: Coastal warnings, high wave alerts, storm surges, and weather advisories.

Dependency Rule:
- If both pfz and geospatial are needed, geospatial MUST be in a later batch than pfz (because geospatial needs PFZ zone coordinates). All other agents may share a batch.

You MUST return ONLY valid JSON matching this exact structure:
{
  "needed_agents": ["weather", "ocean", "pfz", "satellite", "geospatial", "hazard"],
  "execution_plan": [["weather", "ocean", "pfz", "satellite", "hazard"], ["geospatial"]],
  "entities": {
    "lat": null,
    "lon": null,
    "location_name": "Visakhapatnam",
    "date_hint": "tomorrow"
  }
}
"""


def validate_plan(payload: Any) -> Tuple[bool, List[str]]:
    """
    Pure-python validator for planner outputs.
    Returns (is_valid, list_of_error_messages).
    """
    errors: List[str] = []

    if not isinstance(payload, dict):
        return False, ["Payload must be a JSON object (dict)."]

    # 1. needed_agents validation
    needed = payload.get("needed_agents")
    if not isinstance(needed, list) or len(needed) == 0:
        errors.append("needed_agents must be a non-empty list of agent strings.")
    else:
        unknown = [a for a in needed if a not in VALID_AGENTS]
        if unknown:
            errors.append(f"needed_agents contains unknown agents: {unknown}")

    # 2. execution_plan validation
    plan = payload.get("execution_plan")
    if not isinstance(plan, list) or len(plan) == 0:
        errors.append("execution_plan must be a non-empty list of batches (lists).")
    elif isinstance(needed, list) and len(needed) > 0:
        seen_agents = []
        for i, batch in enumerate(plan):
            if not isinstance(batch, list) or len(batch) == 0:
                errors.append(f"execution_plan batch {i} must be a non-empty list.")
                continue
            for agent in batch:
                if agent not in needed:
                    errors.append(
                        f"execution_plan contains agent '{agent}' not declared in needed_agents."
                    )
                seen_agents.append(agent)

        # Check each agent in needed_agents appears exactly once across all batches
        for a in needed:
            count = seen_agents.count(a)
            if count == 0:
                errors.append(f"Agent '{a}' declared in needed_agents is missing from execution_plan.")
            elif count > 1:
                errors.append(
                    f"Agent '{a}' appears {count} times across execution_plan batches; must appear exactly once."
                )

        if len(seen_agents) != len(needed):
            errors.append(
                f"Total agents in execution_plan ({len(seen_agents)}) does not match needed_agents ({len(needed)})."
            )

        # 3. Dependency rule: geospatial must be in later batch than pfz if both present
        if "pfz" in needed and "geospatial" in needed:
            pfz_batch = -1
            geo_batch = -1
            for idx, batch in enumerate(plan):
                if isinstance(batch, list):
                    if "pfz" in batch:
                        pfz_batch = idx
                    if "geospatial" in batch:
                        geo_batch = idx

            if pfz_batch != -1 and geo_batch != -1:
                if geo_batch <= pfz_batch:
                    errors.append(
                        f"Dependency violation: geospatial (batch {geo_batch}) must be in a strictly later batch than pfz (batch {pfz_batch})."
                    )

    # 4. entities validation & coercion
    entities = payload.get("entities")
    if not isinstance(entities, dict):
        errors.append("entities must be a dict.")
    else:
        for coord in ("lat", "lon"):
            val = entities.get(coord)
            if val is not None:
                try:
                    entities[coord] = float(val)
                except (ValueError, TypeError):
                    errors.append(f"Entity '{coord}' must be a number or null; got {repr(val)}.")

        for text_key in ("location_name", "date_hint"):
            val = entities.get(text_key)
            if val is not None and not isinstance(val, str):
                errors.append(f"Entity '{text_key}' must be a string or null; got {repr(val)}.")

    return len(errors) == 0, errors


async def planner_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Planner LangGraph node.
    Emits run_started and plan_created live via TraceCollector.
    Returns state updates for needed_agents, execution_plan, and entities.
    """
    query = state.get("query", "")
    session_id = state.get("session_id", "")

    # Emit run_started immediately
    await collector.emit("run_started", None, {"query": query, "session_id": session_id})

    prompt = f"User Query: {query}\nProvide the needed agents, execution plan, and entities."

    # Attempt 1
    raw_plan = None
    is_valid = False
    errors: List[str] = []

    try:
        raw_plan = await call_llm_json(prompt=prompt, system=PLANNER_SYSTEM_PROMPT)
        is_valid, errors = validate_plan(raw_plan)
    except Exception as exc:
        errors = [f"LLM call or JSON parsing failed: {exc}"]

    # Attempt 2 (retry once with feedback)
    if not is_valid:
        logger.warning("Planner attempt 1 failed validation: %s. Retrying once...", errors)
        retry_prompt = (
            f"User Query: {query}\n\n"
            f"Your previous output was invalid for the following reasons:\n"
            + "\n".join(f"- {e}" for e in errors)
            + "\n\nPlease fix the plan and return valid JSON following the schema and dependency rules exactly."
        )
        try:
            raw_plan = await call_llm_json(prompt=retry_prompt, system=PLANNER_SYSTEM_PROMPT)
            is_valid, errors = validate_plan(raw_plan)
        except Exception as exc:
            errors.append(f"Retry LLM call failed: {exc}")

    if not is_valid or not isinstance(raw_plan, dict):
        logger.warning(
            "Planner attempt 2 also failed validation (%s). Using fallback plan.",
            errors,
        )
        final_plan = FALLBACK_PLAN
    else:
        final_plan = raw_plan

    needed_agents = final_plan["needed_agents"]
    execution_plan = final_plan["execution_plan"]
    entities = final_plan["entities"]

    # Emit plan_created immediately
    await collector.emit(
        "plan_created",
        None,
        {
            "needed_agents": needed_agents,
            "execution_plan": execution_plan,
            "entities": entities,
        },
    )

    return {
        "needed_agents": needed_agents,
        "execution_plan": execution_plan,
        "entities": entities,
    }
