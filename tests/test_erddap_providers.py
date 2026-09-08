import asyncio
import httpx
import pytest

from app.config import settings
from app.tools.erddap_providers import (
    ErddapProvider,
    ProviderError,
    get_authoritative_ocean_enrichment,
    parse_erddap_data,
)
from app.tools.http import clear_cache, set_test_transport


@pytest.fixture(autouse=True)
def cleanup():
    clear_cache()
    set_test_transport(None)
    yield
    clear_cache()
    set_test_transport(None)


TABLE_FIXTURE = {
    "table": {
        "columnNames": ["time", "latitude", "longitude", "sst", "chlorophyll"],
        "columnTypes": ["String", "double", "double", "double", "double"],
        "rows": [
            ["2026-09-08T00:00:00Z", 17.5, 83.0, 28.1, 1.1],
            ["2026-09-08T00:00:00Z", 17.7, 83.2, 28.3, 1.3],
            ["2026-09-08T06:00:00Z", 17.5, 83.0, 28.5, 1.2],
            ["2026-09-08T06:00:00Z", 17.7, 83.2, 28.9, 1.5],
        ],
    }
}

NESTED_DIM_FIXTURE = {
    "dimensions": {
        "time": ["2026-09-07T00:00:00Z", "2026-09-08T00:00:00Z"],
        "latitude": [10.0, 15.0, 20.0],
        "longitude": [80.0, 85.0, 90.0],
    },
    "data": {
        "sst": [
            [
                [26.0, 26.5, 27.0],
                [27.0, 27.5, 28.0],
                [28.0, 28.5, 29.0],
            ],
            [
                [26.5, 27.0, 27.5],
                [27.5, 28.8, 28.5],
                [28.5, 29.0, 29.5],
            ],
        ],
        "chlorophyll": [
            [
                [0.8, 0.9, 1.0],
                [1.1, 1.2, 1.3],
                [1.4, 1.5, 1.6],
            ],
            [
                [0.9, 1.0, 1.1],
                [1.2, 1.85, 1.4],
                [1.5, 1.6, 1.7],
            ],
        ],
    },
}


def test_erddap_table_shape_parsing():
    """Parses table shape fixture for SST and Chlorophyll at latest time step."""
    # Query near (17.7, 83.2)
    sst = parse_erddap_data(TABLE_FIXTURE, 17.68, 83.21, "sst")
    chl = parse_erddap_data(TABLE_FIXTURE, 17.68, 83.21, "chl")

    assert sst == 28.9
    assert chl == 1.5


def test_erddap_nested_dimension_shape_parsing():
    """
    Parses nested dimension shape fixture and verifies nearest-grid-point selection
    on small synthetic axis.
    Synthetic axis: lats=[10.0, 15.0, 20.0], lons=[80.0, 85.0, 90.0].
    Target coordinates: lat=16.0, lon=84.0.
    - abs(15.0 - 16.0) = 1.0 (index 1) vs 6.0 and 4.0
    - abs(85.0 - 84.0) = 1.0 (index 1) vs 4.0 and 6.0
    # Chosen index is (1, 1) for synthetic axis lats=[10.0, 15.0, 20.0], lons=[80.0, 85.0, 90.0] with query (16.0, 84.0)
    At latest time index [-1], grid[-1][1][1] -> sst=28.8, chlorophyll=1.85.
    """
    sst = parse_erddap_data(NESTED_DIM_FIXTURE, 16.0, 84.0, "sst")
    chl = parse_erddap_data(NESTED_DIM_FIXTURE, 16.0, 84.0, "chl")

    assert sst == 28.8
    assert chl == 1.85


def test_erddap_garbage_returns_none():
    """Malformed or surprising JSON formats return None without guessing."""
    assert parse_erddap_data("just a string", 17.0, 83.0, "sst") is None
    assert parse_erddap_data({"unexpected": 123}, 17.0, 83.0, "sst") is None
    assert parse_erddap_data({"table": "corrupted"}, 17.0, 83.0, "sst") is None
    assert parse_erddap_data({"table": {"columnNames": ["time"], "rows": []}}, 17.0, 83.0, "sst") is None
    assert parse_erddap_data({"dimensions": {"lat": []}, "data": {}}, 17.0, 83.0, "sst") is None


def test_erddap_provider_http_500_raises_provider_error(monkeypatch):
    """HTTP 500 server error raises ProviderError."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, json={"error": "server error"})

        set_test_transport(httpx.MockTransport(handler))

        provider = ErddapProvider()
        with pytest.raises(ProviderError) as exc_info:
            await provider.get_sst(17.68, 83.21)
        assert "HTTP 500" in str(exc_info.value)

    asyncio.run(_run())


def test_factory_unconfigured(monkeypatch):
    """Unconfigured provider returns empty tags and None values."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "")

        res = await get_authoritative_ocean_enrichment(17.68, 83.21)
        assert res == {"sst_c": None, "chlorophyll_mg_m3": None, "tags": []}

    asyncio.run(_run())


def test_factory_configured_success(monkeypatch):
    """Configured provider with successful responses returns values and ordered tags."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "OCM-CHL")

        def handler(request: httpx.Request) -> httpx.Response:
            if "OCM-SST" in str(request.url):
                return httpx.Response(200, json=TABLE_FIXTURE)
            if "OCM-CHL" in str(request.url):
                return httpx.Response(200, json=TABLE_FIXTURE)
            return httpx.Response(404)

        set_test_transport(httpx.MockTransport(handler))

        res = await get_authoritative_ocean_enrichment(17.68, 83.21)
        assert res["sst_c"] == 28.9
        assert res["chlorophyll_mg_m3"] == 1.5
        assert res["tags"] == ["incois:erddap(sst)", "incois:erddap(chl)"]

    asyncio.run(_run())


def test_factory_configured_sst_ok_chl_fail(monkeypatch):
    """When SST succeeds but CHL fails, only the SST tag is present."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "OCM-CHL")

        def handler(request: httpx.Request) -> httpx.Response:
            if "OCM-SST" in str(request.url):
                return httpx.Response(200, json=TABLE_FIXTURE)
            if "OCM-CHL" in str(request.url):
                return httpx.Response(502, text="Bad Gateway")
            return httpx.Response(404)

        set_test_transport(httpx.MockTransport(handler))

        res = await get_authoritative_ocean_enrichment(17.68, 83.21)
        assert res["sst_c"] == 28.9
        assert res["chlorophyll_mg_m3"] is None
        assert res["tags"] == ["incois:erddap(sst)"]

    asyncio.run(_run())


def test_factory_configured_total_failure(monkeypatch):
    """When both endpoints fail, factory falls back cleanly without raising."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "OCM-CHL")

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="Internal Server Error")

        set_test_transport(httpx.MockTransport(handler))

        res = await get_authoritative_ocean_enrichment(17.68, 83.21)
        assert res["sst_c"] is None
        assert res["chlorophyll_mg_m3"] is None
        assert res["tags"] == []

    asyncio.run(_run())
