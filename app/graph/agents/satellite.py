from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.graph.agents.utils import run_mock_agent

async def satellite_agent(state: ORCAState, config: RunnableConfig) -> dict:
    mock_data = {
        "source": "mock_satellite",
        "chlorophyll_a": "1.5 mg/m3",
        "cloud_cover": "10%"
    }
    return await run_mock_agent("satellite", config, mock_data)
