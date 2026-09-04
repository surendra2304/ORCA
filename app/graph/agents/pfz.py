from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.graph.agents.utils import run_mock_agent

async def pfz_agent(state: ORCAState, config: RunnableConfig) -> dict:
    mock_data = {
        "source": "mock_pfz",
        "potential_fishing_zone": True,
        "confidence": "85%",
        "depth": "45m"
    }
    return await run_mock_agent("pfz", config, mock_data)
