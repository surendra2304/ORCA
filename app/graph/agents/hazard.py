from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.graph.agents.utils import run_mock_agent

async def hazard_agent(state: ORCAState, config: RunnableConfig) -> dict:
    mock_data = {
        "source": "mock_hazard",
        "cyclone_warning": "None",
        "tsunami_alert": "None"
    }
    return await run_mock_agent("hazard", config, mock_data)
