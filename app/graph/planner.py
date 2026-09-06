import logging
import re
from typing import Any, Dict, List, Tuple

from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.llm.client import call_llm_json

logger = logging.getLogger(__name__)

VALID_AGENTS = {"weather", "ocean", "pfz", "satellite", "geospatial", "hazard"}
CANONICAL_AGENTS = ["weather", "ocean", "pfz", "satellite", "hazard", "geospatial"]

FALLBACK_PLAN = {
    "safety_relevant": True,
    "language": "en",
    "entity_source": "query",
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
Analyze the user query, determine the required agents, extract relevant entities, detect the query language, and formulate an execution plan.

Conversation & Multi-turn Context:
- You are handling turn N of an ongoing conversation. Prior turns are provided when available.
- Resolve conversational references: "there", "same place", "what if I leave earlier", "what's the weather like there" refer to the most recent turn's location and context.
- Entities: If the latest query explicitly names a location or coordinates, extract them and set entity_source = "query". If it does NOT name one but prior turns established one, INHERIT lat, lon, and location_name from the most recent turn and set entity_source = "inherited"; otherwise entity_source = "query" with unknown fields null.

Language Detection:
- Detect the language of the LATEST user query. Return it as an ISO 639-1 two-letter code in "language" (e.g. en, hi, te, ta, bn, mr, gu, kn, ml, or, pa, ur, ...).
- Respond-to language = latest query language, even if earlier turns were in another language.

Safety Determination:
- safety_relevant: boolean flag.
  * true when the query asks about going to sea, safety, trip feasibility, operational or navigation status, vessel safety status, or weather/ocean hazards ("Is it safe to fish?", "Can I sail tomorrow?", "what is my status?", "what is my safety status?").
  * false when the query asks purely about informational locations, finding PFZ zones, navigation distances to ports, or pure weather observation without asking about safety or sailing feasibility (e.g., "Where is the nearest PFZ near Kakinada?", "What is the distance to Chennai port?", "What is the weather there?").

Available Agents:
- weather: Meteorological forecast, wind speed, gusts, precipitation, lightning risk.
- ocean: Ocean state forecast, wave heights, swell, sea surface temperature, tides, and currents.
- pfz: Potential Fishing Zone advisories, fish aggregation coordinates, depth, and confidence.
- satellite: Earth observation satellite imagery, chlorophyll-a concentration, SST anomalies.
- geospatial: Navigational distance and bearing calculations, restricted zones, and EEZ boundary checks. MUST be included whenever coordinates, locations, navigation, or boundary status are checked.
- hazard: Coastal warnings, high wave alerts, storm surges, and weather advisories.

Dependency Rule:
- If both pfz and geospatial are needed, geospatial MUST be in a later batch than pfz (because geospatial needs PFZ zone coordinates). All other agents may share a batch.

You MUST return ONLY valid JSON matching this exact structure:
{
  "safety_relevant": true,
  "language": "en",
  "entity_source": "query",
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

    # 5. language validation
    lang = payload.get("language")
    if not lang or not isinstance(lang, str) or len(lang.strip()) != 2:
        payload["language"] = "en"
    else:
        payload["language"] = lang.strip().lower()

    # 6. entity_source validation
    es = payload.get("entity_source")
    if es is not None and es not in ("query", "inherited"):
        errors.append(f"entity_source must be 'query' or 'inherited'; got {repr(es)}.")
    elif es is None:
        payload["entity_source"] = "query"

    # 7. safety_relevant validation & fail-safe default
    sr = payload.get("safety_relevant")
    if not isinstance(sr, bool):
        payload["safety_relevant"] = True

    return len(errors) == 0, errors


async def planner_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Planner LangGraph node.
    Emits run_started and plan_created live via TraceCollector.
    Returns state updates for safety_relevant, language, entity_source, needed_agents, execution_plan, and entities.
    """
    query = state.get("query", "")
    session_id = state.get("session_id", "")
    run_id = state.get("run_id", session_id)
    history = state.get("history") or []

    # Emit run_started immediately
    await collector.emit(
        "run_started",
        None,
        {
            "query": query,
            "session_id": session_id,
            "run_id": run_id,
            "vessel_class": state.get("vessel_class", "small_fishing_boat"),
            "mode": state.get("mode", "mock"),
        },
    )

    history_lines = []
    if history:
        for idx, turn in enumerate(history[-10:], 1):
            t_q = turn.get("query", "")
            t_l = turn.get("language", "en")
            t_e = turn.get("entities") or {}
            t_loc = t_e.get("location_name") or "None"
            t_lat = t_e.get("lat")
            t_lon = t_e.get("lon")
            t_coords = f"({t_lat}, {t_lon})" if t_lat is not None and t_lon is not None else "coords=None"
            t_v = turn.get("verdict_summary") or "None"
            history_lines.append(
                f"- Turn {idx}: Query=\"{t_q}\", Lang={t_l}, Location={t_loc} {t_coords}, Verdict={t_v}"
            )

    history_digest = "\n".join(history_lines) if history_lines else "None (first turn in conversation)"
    prompt = (
        f"Conversation History (most recent turns):\n{history_digest}\n\n"
        f"User Query: {query}\n"
        f"Provide the safety_relevant flag, detected query language (2-letter ISO code), "
        f"entity_source ('query' or 'inherited'), needed agents, execution plan, and entities."
    )

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
        final_plan = dict(FALLBACK_PLAN)
    else:
        final_plan = raw_plan

    safety_relevant = final_plan.get("safety_relevant", True)
    language = final_plan.get("language", "en")
    entity_source = final_plan.get("entity_source", "query")
    needed_agents = list(final_plan["needed_agents"])
    execution_plan = [list(b) for b in final_plan["execution_plan"]]
    entities = dict(final_plan.get("entities") or {})

    # Ensure entity_source and inheritance are consistently tracked across conversational turns
    if history:
        last_turn = history[-1]
        last_entities = last_turn.get("entities") or {}
        curr_loc = entities.get("location_name")
        last_loc = last_entities.get("location_name")
        if last_loc:
            # If current query doesn't introduce a new location name and has relative or missing location
            if not curr_loc:
                entities.update(last_entities)
                entity_source = "inherited"
            elif last_loc.lower() == str(curr_loc).lower() and last_loc.lower() not in query.lower():
                entity_source = "inherited"

    # Deterministic safety_relevant check for pure weather informational queries
    if re.match(r"^\s*(what('s| is)|how('s| is))\s+(the\s+)?weather\b", query, re.I):
        safety_relevant = False

    # Guarantee geospatial is scheduled if explicit coordinates, EEZ, or restricted zone keywords are present
    has_coords_or_zone = bool(re.search(r"\b\d+(\.\d+)?\s*°?\s*[NS]\b|\b\d+(\.\d+)?\s*°?\s*[EW]\b|coordinates|latitude|longitude|restricted|naval|exclusion|boundary|eez", query, re.I))
    if has_coords_or_zone and "geospatial" not in needed_agents:
        needed_agents.append("geospatial")
        execution_plan.append(["geospatial"])


    # Emit plan_created immediately
    await collector.emit(
        "plan_created",
        None,
        {
            "safety_relevant": safety_relevant,
            "language": language,
            "entity_source": entity_source,
            "needed_agents": needed_agents,
            "execution_plan": execution_plan,
            "entities": entities,
        },
    )

    return {
        "safety_relevant": safety_relevant,
        "language": language,
        "entity_source": entity_source,
        "needed_agents": needed_agents,
        "execution_plan": execution_plan,
        "entities": entities,
    }

