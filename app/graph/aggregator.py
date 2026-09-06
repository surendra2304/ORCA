import json
import logging
from typing import Any, Dict

from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.llm.client import call_llm

logger = logging.getLogger(__name__)

AGGREGATOR_SYSTEM_TEMPLATE = (
    "You are ORCA, a marine advisory assistant. Answer the user's query using ONLY the JSON data provided. "
    "A deterministic rule engine has already computed a safety verdict. You MUST state it exactly "
    "(GO/CAUTION/NO_GO/UNKNOWN) and explain it using ONLY the violations/cautions/reason provided. "
    "You are forbidden from upgrading or downgrading the verdict. If the verdict is UNKNOWN say data is "
    "insufficient and point to official IMD/INCOIS advisories. "
    "Geofence results are absolute: if the verdict reason mentions a restricted zone, name the zone and state entry is prohibited. "
    "If the vessel is outside the Indian EEZ (eez.inside is false) or near the EEZ boundary or IMBL, explicitly state that the vessel is outside the Indian EEZ boundary and warn about interception/permit risks near international maritime boundaries. Never soften a NO-GO. "
    "When pfz zones exist, state the nearest zone's distance and bearing. Never invent coordinates. "
    "Write the ENTIRE answer in {language} (use the native script of {language}: e.g., Devanagari for hi, Bengali for bn, Telugu for te, Tamil for ta). "
    "Keep the verdict token (GO/CAUTION/NO_GO/UNKNOWN) UNTRANSLATED and verbatim — it is a machine field. "
    "Numbers, distances, and zone names stay as-is. Only fall back to English if the language is completely unrecognizable, prefixing with '[en]'. "
    "Be concise (<=130 words), factual, and never invent numbers not present in the data."
)


async def aggregator_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Aggregator LangGraph node.
    Synthesizes a factual, concise natural-language response based on agent outputs and verdict.
    Emits the 'answer' event live via TraceCollector and stores the result in final_answer.
    """
    query = state.get("query", "")
    language = state.get("language", "en")
    agent_outputs = state.get("agent_outputs", {})
    verdict = state.get("verdict")

    system_prompt = AGGREGATOR_SYSTEM_TEMPLATE.format(language=language)
    user_message = (
        f"User Query: {query}\n\n"
        f"Deterministic Safety Verdict:\n"
        f"{json.dumps(verdict, indent=2)}\n\n"
        f"Data from Marine & Meteorological Agents:\n"
        f"{json.dumps(agent_outputs, indent=2)}"
    )

    try:
        final_answer = await call_llm(prompt=user_message, system=system_prompt)
    except Exception as exc:
        logger.error("Aggregator LLM call failed: %s", exc)
        final_answer = (
            f"Advisory generation encountered an error: {exc}. "
            f"Raw agent outputs summary: {list(agent_outputs.keys())} completed."
        )

    await collector.emit("answer", None, {"text": final_answer})

    return {
        "final_answer": final_answer,
    }
