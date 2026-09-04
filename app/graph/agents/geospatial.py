from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.graph.agents.utils import run_mock_agent

async def geospatial_agent(state: ORCAState, config: RunnableConfig) -> dict:
    mock_data = {
        "source": "mock_geospatial",
        "distance_from_shore": "12 nautical miles",
        "nearest_port": "Visakhapatnam"
    }
    return await run_mock_agent("geospatial", config, mock_data)
