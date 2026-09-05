import json
import logging
from typing import Any, Dict

from app.graph.state import ORCAState, create_event
from app.llm.client import call_llm

logger = logging.getLogger(__name__)

AGGREGATOR_SYSTEM_TEMPLATE = (
    "You are ORCA, a marine advisory assistant. Answer the user's query using ONLY the JSON data provided. "
    "Be concise (<=120 words), factual, and respond in language code {language}- even though some data is from "
    "mock sources, answer naturally as if advising a fisherman/coastal user. Never invent numbers not present in the data."
)


async def aggregator_node(state: ORCAState) -> Dict[str, Any]:
    """
    Aggregator LangGraph node.
    Synthesizes a factual, concise natural-language response based on agent outputs.
    Emits the 'answer' event and stores the result in final_answer.
    """
    query = state.get("query", "")
    language = state.get("language", "en")
    agent_outputs = state.get("agent_outputs", {})

    system_prompt = AGGREGATOR_SYSTEM_TEMPLATE.format(language=language)
    user_message = (
        f"User Query: {query}\n\n"
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

    answer_event = create_event("answer", data={"text": final_answer})

    return {
        "final_answer": final_answer,
        "trace": [answer_event],
    }
