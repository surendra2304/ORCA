import json
import time
from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.llm.client import call_llm

AGGREGATOR_PROMPT = """You are the ORCA Aggregator.
Your job is to read the data fetched by the agents and summarize it into a short natural-language answer to the user's query.

User Query: {query}
Agent Outputs: {agent_outputs}

Provide a coherent and helpful summary. Do not output JSON.
"""

async def aggregator_node(state: ORCAState, config: RunnableConfig) -> dict:
    queue = config.get("configurable", {}).get("queue")
    
    start_event = {
        "event": "aggregator_start",
        "timestamp": time.time(),
        "data": {}
    }
    if queue:
        await queue.put(start_event)
        
    prompt = AGGREGATOR_PROMPT.format(
        query=state["query"],
        agent_outputs=json.dumps(state.get("agent_outputs", {}), indent=2)
    )
    
    try:
        final_answer = await call_llm(prompt, expect_json=False)
    except Exception as e:
        final_answer = f"Error generating final answer: {e}"
        
    done_event = {
        "event": "final_answer",
        "timestamp": time.time(),
        "data": {"answer": final_answer}
    }
    
    if queue:
        await queue.put(done_event)
        
    return {
        "final_answer": final_answer,
        "trace": [start_event, done_event]
    }
