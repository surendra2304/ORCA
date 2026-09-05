from typing import Any, Dict
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState


class WeatherAgent(MockAgent):
    name = "weather"
    description = "Meteorological forecast from IMD with winds, gusts, rain, and lightning risk."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:IMD",
            "wind_knots": 14.2,
            "gusts_knots": 22.0,
            "rain_mm": 3.1,
            "lightning_risk": "low",
            "forecast_hours": [
                {
                    "hour": h,
                    "wind_knots": round(14.0 + (h % 3) * 1.5, 1),
                    "rain_mm": round(max(0.0, 3.1 - h * 0.4), 1),
                }
                for h in range(1, 8)
            ],
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        return f"Wind {payload.get('wind_knots')} kts, gusts {payload.get('gusts_knots')} kts, rain {payload.get('rain_mm')} mm, lightning risk {payload.get('lightning_risk')}."


agent = WeatherAgent()
