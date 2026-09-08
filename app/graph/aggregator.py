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
    "Geofence results are absolute: only name a restricted zone when restricted.inside is true; when user=null, never imply presence in or near any zone. "
    "When eez.inside=false AND the user position is known, state the position is outside Indian waters. When the user position is UNKNOWN (user=null), you MUST say the location is unknown/needed — NEVER claim the vessel is outside Indian waters, near a boundary, or inside any zone. Never soften a NO-GO. "
    "When pfz zones exist, state the nearest zone's distance and bearing. Never invent coordinates. "
    "When route data is present, present each route with distance, mean wave height, and the departure window. "
    "Routes are ADVISORY comparisons, not safety verdicts; the GO/CAUTION/NO_GO verdict (if any) comes only from the safety rule engine. "
    "If route.origin/destination failed to resolve, say the route could not be computed and ask for clearer locations. "
    "Write the ENTIRE answer in {language} (use the native script of {language}: e.g., Devanagari for hi, Bengali for bn, Telugu for te, Tamil for ta). "
    "For hi/bn/mr use the native word for verdict (Hindi: निर्णय, Bengali: রায়); never transliterate the English word. "
    "Keep the verdict token (GO/CAUTION/NO_GO/UNKNOWN) UNTRANSLATED and verbatim — it is a machine field. "
    "Numbers, distances, and zone names stay as-is. Only fall back to English if the language is completely unrecognizable, prefixing with '[en]'. "
    "Be concise (<=130 words), factual, and never invent numbers not present in the data."
)


async def aggregator_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Aggregator LangGraph node.
    Synthesizes a factual, concise natural-language response based on agent outputs and verdict.
    Emits the 'final_answer' event live via TraceCollector and stores the result in final_answer.
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

    await collector.emit("final_answer", None, {"text": final_answer})

    return {
        "final_answer": final_answer,
    }
