from typing import Any, Dict
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState


class PFZAgent(MockAgent):
    name = "pfz"
    description = "INCOIS Potential Fishing Zones (PFZ) advisory with coordinates, depths, and confidence."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:INCOIS-PFZ",
            "advisory_id": "PFZ-20260905-01",
            "zones": [
                {
                    "polygon": [
                        [16.3, 82.3],
                        [16.3, 82.7],
                        [16.7, 82.7],
                        [16.7, 82.3],
                    ],
                    "depth_m": 45,
                    "center": [16.5, 82.5],
                    "confidence": 0.78,
                }
            ],
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        zones = payload.get("zones", [])
        count = len(zones)
        conf = zones[0].get("confidence", 0.0) if count > 0 else 0.0
        return f"Identified {count} Potential Fishing Zone(s) with confidence {conf:.0%}."


agent = PFZAgent()
