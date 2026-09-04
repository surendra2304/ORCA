import json
import time
from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.llm.client import call_llm

PLANNER_PROMPT = """You are the ORCA Planner.
Your job is to analyze the user query and decide which agents are needed, extract entities, and create an execution plan.

Available agents: weather, ocean, pfz, satellite, geospatial, hazard.

Rule: "geospatial should be in a later batch than pfz if both are needed, because geospatial may need pfz's coordinates. All other agents can run in the same batch."

Output JSON ONLY in the following format:
{
  "needed_agents": ["weather", "ocean", ...],
  "execution_plan": [["weather", "pfz", ...], ["geospatial"]],
  "entities": {"lat": null, "lon": null, "location_name": "Visakhapatnam", "date": "tomorrow"}
}

Query: {query}
"""

async def planner_node(state: ORCAState, config: RunnableConfig) -> dict:
    queue = config.get("configurable", {}).get("queue")
    
    start_event = {
        "event": "planner_start",
        "timestamp": time.time(),
        "data": {}
    }
    if queue:
        await queue.put(start_event)
        
    prompt = PLANNER_PROMPT.format(query=state["query"])
    
    try:
        response_text = await call_llm(prompt, expect_json=True)
        # Try to parse JSON from the response text (stripping markdown if present)
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        plan = json.loads(clean_text)
        needed_agents = plan.get("needed_agents", [])
        execution_plan = plan.get("execution_plan", [needed_agents])
        entities = plan.get("entities", {})
    except Exception as e:
        # Fallback if parsing fails
        print(f"Planner JSON parsing failed: {e}. Falling back to default plan.")
        needed_agents = ["weather", "ocean", "pfz", "satellite", "geospatial", "hazard"]
        execution_plan = [needed_agents]
        entities = {}
        
    done_event = {
        "event": "planner_done",
        "timestamp": time.time(),
        "data": {
            "needed_agents": needed_agents,
            "execution_plan": execution_plan,
            "entities": entities
        }
    }
    if queue:
        await queue.put(done_event)
        
    return {
        "needed_agents": needed_agents,
        "execution_plan": execution_plan,
        "entities": entities,
        "trace": [start_event, done_event]
    }
