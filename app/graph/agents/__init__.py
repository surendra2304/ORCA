from typing import Dict

from app.graph.agents.base import MockAgent
from app.graph.agents.geospatial import agent as geospatial_agent
from app.graph.agents.hazard import agent as hazard_agent
from app.graph.agents.ocean import agent as ocean_agent
from app.graph.agents.pfz import agent as pfz_agent
from app.graph.agents.satellite import agent as satellite_agent
from app.graph.agents.weather import agent as weather_agent

AGENT_REGISTRY: Dict[str, MockAgent] = {
    "weather": weather_agent,
    "ocean": ocean_agent,
    "pfz": pfz_agent,
    "satellite": satellite_agent,
    "geospatial": geospatial_agent,
    "hazard": hazard_agent,
}

__all__ = [
    "MockAgent",
    "AGENT_REGISTRY",
    "weather_agent",
    "ocean_agent",
    "pfz_agent",
    "satellite_agent",
    "geospatial_agent",
    "hazard_agent",
]
