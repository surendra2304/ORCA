import asyncio
import pytest

from app.graph.agents.geospatial import GeospatialAgent
from app.graph.trace import TraceCollector


def test_geospatial_selects_nearest_zone_not_first():
    async def _run():
        agent = GeospatialAgent()
        collector = TraceCollector()

        # User at Kakinada (16.98, 82.25)
        state = {
            "entities": {"lat": 16.98, "lon": 82.25},
            "agent_outputs": {
                "pfz": {
                    "source": "incois:advisory-file",
                    "zones": [
                        {"center": [17.6, 83.5], "confidence": 0.75},  # Vizag area ~150km away (First in list)
                        {"center": [16.5, 82.5], "confidence": 0.82},  # Nearby area ~60km away (Second in list)
                    ],
                }
            },
        }

        res = await agent.run(collector, state)

        assert res["source"] == "orca:geospatial"
        assert res["user"] == {"lat": 16.98, "lon": 82.25}
        assert res["pfz"]["zones_considered"] == 2

        nearest = res["pfz"]["nearest"]
        assert nearest is not None
        # Must select the SECOND zone [16.5, 82.5] because it is closer (~60 km vs ~150 km)
        assert nearest["center"] == [16.5, 82.5]
        assert abs(nearest["distance_km"] - 60.7) <= 2.0
        assert 130.0 <= nearest["bearing_deg"] <= 160.0

        # Ports check
        assert res["ports"]["nearest"]["name"] == "Kakinada"
        assert res["ports"]["nearest"]["distance_km"] < 2.0

        # EEZ check
        assert res["eez"]["inside"] is True

    asyncio.run(_run())


def test_geospatial_restricted_zone_inside():
    async def _run():
        agent = GeospatialAgent()
        collector = TraceCollector()

        # User right inside the Visakhapatnam Naval Exclusion Area: (17.70, 83.30)
        state = {
            "entities": {"lat": 17.70, "lon": 83.30},
            "agent_outputs": {},
        }

        res = await agent.run(collector, state)

        assert res["restricted"]["inside"] is True
        assert res["restricted"]["zone"] == "Visakhapatnam Naval Exclusion Area"
        assert res["restricted"]["nearest_km"] == 0.0

    asyncio.run(_run())


def test_geospatial_missing_user_coords():
    async def _run():
        agent = GeospatialAgent()
        collector = TraceCollector()

        state = {
            "entities": {"lat": None, "lon": None},
            "agent_outputs": {},
        }

        res = await agent.run(collector, state)

        assert res["source"] == "orca:geospatial"
        assert res["user"] is None
        assert res["pfz"] is None
        assert res["ports"] is None
        assert res["restricted"] is None
        assert res["eez"]["inside"] is False
        assert res["eez"]["nearest_boundary_km"] is None
        assert res["note"] == "no location in query"

    asyncio.run(_run())
