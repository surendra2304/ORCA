import asyncio
import json
from pathlib import Path
import httpx
import pytest

from app.config import settings
from app.graph.agents.hazard import HazardAgent
from app.graph.trace import TraceCollector
from app.tools.hazard_providers import (
    AdvisoryFileProvider,
    ImdCapProvider,
    IncoisAlertsProvider,
    ProviderError,
    get_hazard_payload,
)
from app.tools.http import set_test_transport


CANNED_CAP_XML = """<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>IMD-TEST-2025-001</identifier>
  <sender>imd.gov.in</sender>
  <sent>2025-09-01T10:00:00+05:30</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>Met</category>
    <event>Cyclone</event>
    <urgency>Expected</urgency>
    <severity>Severe</severity>
    <certainty>Observed</certainty>
    <expires>2025-09-02T18:00:00+05:30</expires>
    <headline>Severe Cyclonic Storm warning for coastal areas</headline>
    <area>
      <areaDesc>North Bay of Bengal and Odisha coast</areaDesc>
      <circle>19.5,86.5 100.0</circle>
    </area>
  </info>
  <info>
    <category>Met</category>
    <event>Thunderstorm/Lightning</event>
    <urgency>Expected</urgency>
    <severity>Moderate</severity>
    <certainty>Likely</certainty>
    <expires>2025-09-02T12:00:00+05:30</expires>
    <headline>Thunderstorm with lightning warning</headline>
    <area>
      <areaDesc>South Andhra coast</areaDesc>
      <polygon>16.0,82.0 16.5,82.0 16.5,82.5 16.0,82.5 16.0,82.0</polygon>
    </area>
  </info>
</alert>
"""


def test_advisory_file_provider_loads_sample():
    async def _run():
        provider = AdvisoryFileProvider()
        alerts = await provider.get_alerts(16.9, 82.3)

        assert len(alerts) >= 2
        types = [a["type"] for a in alerts]
        assert "high_wave" in types
        assert "fishermen_warning" in types

        hw = next(a for a in alerts if a["type"] == "high_wave")
        assert hw["severity"] == "moderate"
        assert hw["center"] == [16.9, 82.3]
        assert hw["radius_km"] == 60.0

    asyncio.run(_run())


def test_advisory_file_provider_empty_dir(tmp_path):
    async def _run():
        provider = AdvisoryFileProvider(advisory_dir=str(tmp_path))
        alerts = await provider.get_alerts(16.9, 82.3)
        assert alerts == []

    asyncio.run(_run())


def test_imd_cap_provider_parses_xml(monkeypatch):
    async def _run():
        monkeypatch.setattr(settings, "IMD_CAP_FEED_URL", "https://api.imd.gov.in/cap/feed.xml")

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, text=CANNED_CAP_XML, headers={"content-type": "application/xml"})

        set_test_transport(httpx.MockTransport(handler))

        provider = ImdCapProvider()
        alerts = await provider.get_alerts(19.5, 86.5)

        assert len(alerts) == 2
        cyclone = next(a for a in alerts if a["type"] == "cyclone")
        assert cyclone["severity"] == "extreme"
        assert cyclone["center"] == [19.5, 86.5]
        assert cyclone["radius_km"] == 100.0

        lightning = next(a for a in alerts if a["type"] == "lightning")
        assert lightning["severity"] == "moderate"
        assert lightning["center"] is not None
        assert lightning["radius_km"] == 50.0

    asyncio.run(_run())


def test_incois_alerts_provider_json_and_alias(monkeypatch):
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ALERTS_BASE_URL", "https://api.incois.gov.in/alerts")

        canned = {
            "high_wave_alerts": [  # Alias tolerance
                {
                    "type": "high_wave",
                    "severity": "high",
                    "area": "Offshore Visakhapatnam",
                    "center": [17.7, 83.3],
                    "radius_km": 40.0,
                }
            ]
        }

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=canned)

        set_test_transport(httpx.MockTransport(handler))

        provider = IncoisAlertsProvider()
        alerts = await provider.get_alerts(17.7, 83.3)

        assert len(alerts) == 1
        assert alerts[0]["type"] == "high_wave"
        assert alerts[0]["severity"] == "high"
        assert alerts[0]["radius_km"] == 40.0

        # ProviderError path on HTTP 500
        def error_handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="Internal Server Error")

        set_test_transport(httpx.MockTransport(error_handler))
        with pytest.raises(ProviderError):
            await provider.get_alerts(17.7, 83.3)

    asyncio.run(_run())


def test_factory_multi_source_merge(monkeypatch, tmp_path):
    async def _run():
        monkeypatch.setattr(settings, "IMD_CAP_FEED_URL", "https://api.imd.gov.in/cap/feed.xml")
        monkeypatch.setattr(settings, "INCOIS_ALERTS_BASE_URL", "https://api.incois.gov.in/alerts")

        # Bundle one alert in tmp_path file
        sample_file = tmp_path / "sample.json"
        with open(sample_file, "w", encoding="utf-8") as f:
            json.dump({
                "advisory_date": "2025-09-01",
                "alerts": [{"type": "swell_surge", "severity": "moderate", "area": "Coast", "center": [10.0, 80.0], "radius_km": 30.0}]
            }, f)
        monkeypatch.setattr(settings, "HAZARD_ADVISORY_DIR", str(tmp_path))

        def handler(request: httpx.Request) -> httpx.Response:
            if "imd" in str(request.url):
                return httpx.Response(200, text=CANNED_CAP_XML, headers={"content-type": "application/xml"})
            elif "incois" in str(request.url):
                return httpx.Response(200, json={"alerts": [{"type": "high_wave", "severity": "moderate", "area": "Marine", "center": [16.0, 82.0], "radius_km": 50.0}]})
            return httpx.Response(404)

        set_test_transport(httpx.MockTransport(handler))

        payload = await get_hazard_payload(16.9, 82.3, mode="real")
        assert "imd:cap" in payload["source"]
        assert "incois:alerts" in payload["source"]
        assert "hazard:advisory-file" in payload["source"]
        assert len(payload["alerts"]) == 4  # 2 IMD + 1 INCOIS + 1 File

    asyncio.run(_run())


def test_factory_empty_dir_honesty(monkeypatch, tmp_path):
    async def _run():
        monkeypatch.setattr(settings, "IMD_CAP_FEED_URL", "")
        monkeypatch.setattr(settings, "INCOIS_ALERTS_BASE_URL", "")
        monkeypatch.setattr(settings, "HAZARD_ADVISORY_DIR", str(tmp_path))

        payload = await get_hazard_payload(16.9, 82.3, mode="real")
        assert payload["source"] == "hazard:advisory-file"
        assert payload["alerts"] == []
        assert "no hazard advisories available" in str(payload["note"])

    asyncio.run(_run())


def test_hazard_agent_location_relevance():
    async def _run():
        agent = HazardAgent()
        col = TraceCollector()

        # User at Kakinada coast (16.98, 82.25)
        # Sample alert 1 center: [16.9, 82.3], radius 60km -> distance ~10km <= 60km -> affected=True
        # Sample alert 2 center: [9.2, 79.3], radius 80km -> distance ~900km > 80km -> affected=False
        state = {
            "mode": "real",
            "entities": {"lat": 16.98, "lon": 82.25},
        }
        res = await agent.run(col, state)

        alerts = res["alerts"]
        hw = next(a for a in alerts if a["type"] == "high_wave")
        assert hw["distance_km"] is not None
        assert hw["distance_km"] < 20.0
        assert hw["affected"] is True

        fw = next(a for a in alerts if a["type"] == "fishermen_warning")
        assert fw["distance_km"] is not None
        assert fw["distance_km"] > 500.0
        assert fw["affected"] is False

        # Missing user coords -> alerts retained with affected=None, distance_km=None
        state_no_coords = {"mode": "real", "entities": {}}
        res_no_coords = await agent.run(col, state_no_coords)
        for a in res_no_coords["alerts"]:
            assert a["distance_km"] is None
            assert a["affected"] is None

    asyncio.run(_run())
