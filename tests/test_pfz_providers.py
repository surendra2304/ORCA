import asyncio
from pathlib import Path
import httpx
import pytest

from app.config import settings
from app.tools.http import clear_cache, set_test_transport
from app.tools.pfz_providers import (
    AdvisoryFileProvider,
    IncoisProvider,
    ProviderError,
    get_pfz_payload,
)

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "data" / "pfz_advisories"


@pytest.fixture(autouse=True)
def cleanup():
    clear_cache()
    set_test_transport(None)
    yield
    clear_cache()
    set_test_transport(None)


def test_advisory_file_provider_loads_sample():
    async def _run():
        provider = AdvisoryFileProvider(advisory_dir=str(SAMPLE_DIR))
        res = await provider.get_zones(16.98, 82.25)

        assert res["source"] == "incois:advisory-file"
        assert res["advisory_id"] == "PFZ-INCOIS-20250901-01"
        assert res["advisory_date"] == "2025-09-01"
        assert len(res["zones"]) >= 1
        assert "depth_m" in res["zones"][0]
        assert "center" in res["zones"][0]
        assert "confidence" in res["zones"][0]

    asyncio.run(_run())


def test_advisory_file_provider_empty_dir_honesty(tmp_path):
    async def _run():
        # Empty temporary directory
        provider = AdvisoryFileProvider(advisory_dir=str(tmp_path))
        res = await provider.get_zones(16.98, 82.25)

        assert res["source"] == "incois:advisory-file"
        assert res["advisory_id"] is None
        assert res["advisory_date"] is None
        assert res["zones"] == []
        assert "consult official INCOIS advisories" in str(res["note"])

    asyncio.run(_run())


def test_incois_provider_with_mock_transport(monkeypatch):
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_API_KEY", "test-incois-key")
        monkeypatch.setattr(settings, "INCOIS_PFZ_BASE_URL", "https://api.incois.gov.in/pfz")

        canned_response = {
            "advisory_id": "LIVE-API-2026-001",
            "advisory_date": "2026-09-06",
            "pfz_zones": [  # Alias tolerance
                {
                    "polygon": [[16.3, 82.3], [16.3, 82.7], [16.7, 82.7], [16.7, 82.3]],
                    "depth_m": 50.0,
                    "center": [16.5, 82.5],
                    "confidence": 0.85,
                }
            ],
            "note": None,
        }

        def handler(request: httpx.Request) -> httpx.Response:
            assert request.headers.get("apikey") == "test-incois-key"
            return httpx.Response(200, json=canned_response)

        set_test_transport(httpx.MockTransport(handler))

        provider = IncoisProvider()
        res = await provider.get_zones(16.98, 82.25)

        assert res["source"] == "incois:api"
        assert res["advisory_id"] == "LIVE-API-2026-001"
        assert res["advisory_date"] == "2026-09-06"
        assert len(res["zones"]) == 1
        assert res["zones"][0]["confidence"] == 0.85

    asyncio.run(_run())


def test_incois_provider_error_on_500(monkeypatch):
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_API_KEY", "test-incois-key")
        monkeypatch.setattr(settings, "INCOIS_PFZ_BASE_URL", "https://api.incois.gov.in/pfz")

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, json={"error": "internal server error"})

        set_test_transport(httpx.MockTransport(handler))

        provider = IncoisProvider()
        with pytest.raises(ProviderError):
            await provider.get_zones(16.98, 82.25)

    asyncio.run(_run())


def test_factory_chain_real_mode_fallback(monkeypatch):
    async def _run():
        # Without key -> uses file provider
        monkeypatch.setattr(settings, "INCOIS_API_KEY", "")
        monkeypatch.setattr(settings, "INCOIS_PFZ_BASE_URL", "")

        res = await get_pfz_payload(16.98, 82.25, mode="real")
        assert res["source"] == "incois:advisory-file"
        assert len(res["zones"]) >= 1

        # With key but server error -> falls through to file provider
        monkeypatch.setattr(settings, "INCOIS_API_KEY", "test-incois-key")
        monkeypatch.setattr(settings, "INCOIS_PFZ_BASE_URL", "https://api.incois.gov.in/pfz")

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(502, text="Bad Gateway")

        set_test_transport(httpx.MockTransport(handler))

        res_fallback = await get_pfz_payload(16.98, 82.25, mode="real")
        assert res_fallback["source"] == "incois:advisory-file"

    asyncio.run(_run())
