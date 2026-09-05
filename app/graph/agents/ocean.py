from typing import Any, Dict
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState


class OceanAgent(MockAgent):
    name = "ocean"
    description = "INCOIS Ocean State Forecast with wave heights, swells, currents, and SST."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:INCOIS-OSF",
            "wave_height_m": 2.8,
            "wave_period_s": 9.0,
            "swell_height_m": 1.9,
            "sst_c": 28.4,
            "current_knots": 1.2,
            "tide_state": "rising",
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        return f"Waves {payload.get('wave_height_m')}m, swell {payload.get('swell_height_m')}m, SST {payload.get('sst_c')}°C, tide {payload.get('tide_state')}."


agent = OceanAgent()
