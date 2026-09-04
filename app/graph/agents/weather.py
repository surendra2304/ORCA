from langchain_core.runnables import RunnableConfig
from app.graph.state import ORCAState
from app.graph.agents.utils import run_mock_agent

async def weather_agent(state: ORCAState, config: RunnableConfig) -> dict:
    mock_data = {
        "source": "mock_weather",
        "forecast": "Clear skies, temperature 28°C",
        "wind_speed": "15 km/h"
    }
    return await run_mock_agent("weather", config, mock_data)
