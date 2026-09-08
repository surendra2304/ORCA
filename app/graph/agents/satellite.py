from typing import Any, Dict
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState


class SatelliteAgent(MockAgent):
    name = "satellite"
    description = "MOSDAC satellite observations with sea surface temperature and chlorophyll-a."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:MOSDAC",
            "sst_c": 28.9,
            "chlorophyll_mg_m3": 1.4,
            "sst_anomaly_c": 0.6,
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        return f"Chlorophyll-a {payload.get('chlorophyll_mg_m3')} mg/m³, SST {payload.get('sst_c')}°C (anomaly +{payload.get('sst_anomaly_c')}°C)."


agent = SatelliteAgent()
