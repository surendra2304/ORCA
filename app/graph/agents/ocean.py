from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.graph.agents.utils import run_mock_agent

async def ocean_agent(state: ORCAState, config: RunnableConfig) -> dict:
    mock_data = {
        "source": "mock_ocean",
        "wave_height": "1.2m",
        "sea_surface_temperature": "29°C"
    }
    return await run_mock_agent("ocean", config, mock_data)
