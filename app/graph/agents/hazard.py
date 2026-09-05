from typing import Any, Dict
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState


class HazardAgent(MockAgent):
    name = "hazard"
    description = "Marine hazard alerts from IMD & INCOIS for high waves, squally winds, and storms."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:IMD+INCOIS",
            "alerts": [
                {
                    "type": "high_wave",
                    "severity": "moderate",
                    "validity": "Next 24 hours",
                    "area": "South Andhra Coast",
                },
                {
                    "type": "lightning",
                    "severity": "low",
                    "validity": "Today evening",
                    "area": "Offshore Visakhapatnam",
                },
            ],
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        alerts = payload.get("alerts", [])
        types = [a.get("type", "unknown") for a in alerts]
        return f"Active marine alerts ({len(alerts)}): {', '.join(types)}."


agent = HazardAgent()
