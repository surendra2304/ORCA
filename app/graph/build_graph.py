import asyncio
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END

from app.graph.state import ORCAState
from app.graph.planner import planner_node
from app.graph.aggregator import aggregator_node

from app.graph.agents.weather import weather_agent
from app.graph.agents.ocean import ocean_agent
from app.graph.agents.pfz import pfz_agent
from app.graph.agents.satellite import satellite_agent
from app.graph.agents.geospatial import geospatial_agent
from app.graph.agents.hazard import hazard_agent

AGENT_FUNCTIONS = {
    "weather": weather_agent,
    "ocean": ocean_agent,
    "pfz": pfz_agent,
    "satellite": satellite_agent,
    "geospatial": geospatial_agent,
    "hazard": hazard_agent,
}

async def execute_agents_node(state: ORCAState, config: RunnableConfig) -> dict:
    execution_plan = state.get("execution_plan", [])
    
    agent_outputs = {}
    all_traces = []
    
    for batch in execution_plan:
        tasks = []
        agent_names = []
        for agent_name in batch:
            if agent_name in AGENT_FUNCTIONS:
                tasks.append(AGENT_FUNCTIONS[agent_name](state, config))
                agent_names.append(agent_name)
        
        if tasks:
            results = await asyncio.gather(*tasks)
            for name, result in zip(agent_names, results):
                agent_outputs[name] = result["output"]
                if "trace" in result:
                    all_traces.extend(result["trace"])
                    
    return {
        "agent_outputs": agent_outputs,
        "trace": all_traces
    }

def build_orca_graph():
    builder = StateGraph(ORCAState)
    builder.add_node("planner", planner_node)
    builder.add_node("execute_agents", execute_agents_node)
    builder.add_node("aggregator", aggregator_node)
    
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "execute_agents")
    builder.add_edge("execute_agents", "aggregator")
    builder.add_edge("aggregator", END)
    
    return builder.compile()
