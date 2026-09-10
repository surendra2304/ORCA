"""
Authoritative Ocean Data Provider Chain (INCOIS ERDDAP):
- ProviderError: Raised when ERDDAP HTTP transport or server fails.
- ErddapProvider: Client querying INCOIS ERDDAP griddap endpoints for SST and Chlorophyll-a.
- get_authoritative_ocean_enrichment: Factory querying configured endpoints and returning tags.

Salvaged from 88986cf: ERDDAP endpoints are keyless public services with separated griddap
datasets for SST and Chlorophyll; nearest-grid-point selection must be computed client-side.
"""

import logging
import math
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings
from app.tools.http import get_client

logger = logging.getLogger(__name__)


class ProviderError(Exception):
    """Raised when an external ERDDAP provider fails (transport or HTTP error)."""
    pass


def _find_col_idx(cols: List[str], keywords: List[str]) -> Optional[int]:
    """Helper to find column index matching any keyword in order."""
    for kw in keywords:
        for idx, col in enumerate(cols):
            if kw in col:
                return idx
    return None


def parse_erddap_data(data: Any, lat: float, lon: float, var_type: str = "sst") -> Optional[float]:
    """
    Parses ERDDAP JSON response tolerant of common shapes:
    1. Table shape: {"table": {"columnNames": [...], "rows": [...]}}
    2. Nested dimension shape: {"dimensions": {...}, "data": {...}}
    Returns nearest-grid-point float at latest time step, or None on any parse surprise.
    Never guesses.
    """
    if not isinstance(data, dict):
        return None

    # adapt field mapping when the INCOIS ERDDAP endpoint is confirmed; tests use MockTransport fixtures.

    # -------------------------------------------------------------
    # Shape 1: ERDDAP Table JSON
    # -------------------------------------------------------------
    if "table" in data and isinstance(data["table"], dict):
        table = data["table"]
        col_names = table.get("columnNames")
        rows = table.get("rows")
        if not isinstance(col_names, list) or not isinstance(rows, list) or not rows:
            return None

        cols_lower = [str(c).strip().lower() for c in col_names]

        lat_idx = _find_col_idx(cols_lower, ["latitude", "lat"])
        lon_idx = _find_col_idx(cols_lower, ["longitude", "lon"])
        time_idx = _find_col_idx(cols_lower, ["time", "timestamp", "date"])

        if var_type == "sst":
            var_idx = _find_col_idx(cols_lower, ["sst", "sea_surface_temperature", "temp", "temperature"])
        else:  # chl / chlorophyll
            var_idx = _find_col_idx(cols_lower, ["chlorophyll_a", "chlorophyll", "chl"])

        # Fallback: if var column wasn't named with standard keywords, find any non-coordinate column
        if var_idx is None:
            coord_indices = {lat_idx, lon_idx, time_idx} - {None}
            remaining = [i for i in range(len(cols_lower)) if i not in coord_indices]
            if len(remaining) == 1:
                var_idx = remaining[0]

        if lat_idx is None or lon_idx is None or var_idx is None:
            return None

        req_len = max(lat_idx, lon_idx, var_idx) + 1

        # Select latest time step if time column is available
        if time_idx is not None:
            valid_times = [
                str(r[time_idx]) for r in rows
                if len(r) > time_idx and r[time_idx] is not None
            ]
            if valid_times:
                latest_time = max(valid_times)
                candidate_rows = [
                    r for r in rows
                    if len(r) >= req_len and str(r[time_idx]) == latest_time
                ]
            else:
                candidate_rows = [r for r in rows if len(r) >= req_len]
        else:
            candidate_rows = [r for r in rows if len(r) >= req_len]

        if not candidate_rows:
            return None

        # Nearest grid point selection via Euclidean distance
        best_row = None
        min_dist_sq = float("inf")
        for row in candidate_rows:
            try:
                r_lat = float(row[lat_idx])
                r_lon = float(row[lon_idx])
                dist_sq = (r_lat - lat) ** 2 + (r_lon - lon) ** 2
                if dist_sq < min_dist_sq:
                    min_dist_sq = dist_sq
                    best_row = row
            except (ValueError, TypeError):
                continue

        if best_row is None:
            return None

        try:
            val = best_row[var_idx]
            if val is None:
                return None
            val_float = float(val)
            if math.isnan(val_float):
                return None
            return val_float
        except (ValueError, TypeError):
            return None

    # -------------------------------------------------------------
    # Shape 2: Nested Dimension JSON
    # -------------------------------------------------------------
    dims = data.get("dimensions") or data.get("axes") or data.get("coords")
    data_dict = data.get("data") or data.get("values") or data.get("variables")

    if isinstance(dims, dict) and isinstance(data_dict, dict):
        lat_key = next((k for k in dims if "lat" in k.lower()), None)
        lon_key = next((k for k in dims if "lon" in k.lower()), None)

        if not lat_key or not lon_key:
            return None

        try:
            lats = [float(x) for x in dims[lat_key]]
            lons = [float(x) for x in dims[lon_key]]
        except (ValueError, TypeError):
            return None

        if not lats or not lons:
            return None

        # 1D nearest grid point selection:
        # i* = argmin_i |lats[i] - lat|
        # j* = argmin_j |lons[j] - lon|
        # Synthetic axis test: lats=[10.0, 15.0, 20.0], lons=[80.0, 85.0, 90.0] with query (16.0, 84.0) -> chosen index is (1, 1).
        best_lat_idx = min(range(len(lats)), key=lambda i: abs(lats[i] - lat))
        best_lon_idx = min(range(len(lons)), key=lambda j: abs(lons[j] - lon))

        # Find target variable in data dict
        var_key = None
        if var_type == "sst":
            var_key = next((k for k in data_dict if any(x in k.lower() for x in ["sst", "sea_surface_temperature", "temp"])), None)
        else:
            var_key = next((k for k in data_dict if any(x in k.lower() for x in ["chl", "chlorophyll"])), None)

        if not var_key and len(data_dict) == 1:
            var_key = list(data_dict.keys())[0]

        if not var_key:
            return None

        grid = data_dict.get(var_key)
        if not isinstance(grid, list) or not grid:
            return None

        try:
            # If 3D [time][lat][lon]: pick latest time [-1]
            if isinstance(grid[0], list) and isinstance(grid[0][0], list):
                time_slice = grid[-1]
                val = time_slice[best_lat_idx][best_lon_idx]
            elif isinstance(grid[0], list):
                # 2D [lat][lon]
                val = grid[best_lat_idx][best_lon_idx]
            else:
                return None

            if val is None:
                return None
            val_float = float(val)
            if math.isnan(val_float):
                return None
            return val_float
        except (IndexError, ValueError, TypeError):
            return None

    # On any parse/shape surprise return None — never guess.
    return None


class ErddapProvider:
    """
    Authoritative ocean provider querying INCOIS ERDDAP griddap endpoints.
    Configured iff INCOIS_ERDDAP_BASE_URL and relevant dataset ID are set.
    """

    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = (base_url or settings.INCOIS_ERDDAP_BASE_URL).rstrip("/")

    @property
    def is_sst_configured(self) -> bool:
        return bool(self.base_url and settings.INCOIS_ERDDAP_SST_DATASET.strip())

    @property
    def is_chl_configured(self) -> bool:
        return bool(self.base_url and settings.INCOIS_ERDDAP_CHL_DATASET.strip())

    @property
    def is_configured(self) -> bool:
        return self.is_sst_configured or self.is_chl_configured

    async def _fetch_and_extract(
        self,
        dataset_id: str,
        lat: float,
        lon: float,
        var_type: str,
    ) -> Optional[float]:
        """Issues griddap request, raises ProviderError on HTTP/transport failure."""
        url = f"{self.base_url}/griddap/{dataset_id}.json"
        client = get_client()

        try:
            response = await client.get(url, timeout=settings.HTTP_TIMEOUT_S)
            if response.status_code >= 400:
                raise ProviderError(f"HTTP {response.status_code} from ERDDAP endpoint {url}")
            try:
                data = response.json()
            except Exception:
                # Shape/parse surprise
                return None
        except ProviderError:
            raise
        except (httpx.TransportError, httpx.TimeoutException) as exc:
            raise ProviderError(f"ERDDAP transport failure for {url}: {exc}") from exc
        except Exception as exc:
            raise ProviderError(f"ERDDAP request failed for {url}: {exc}") from exc

        return parse_erddap_data(data, lat, lon, var_type)

    async def get_sst(self, lat: float, lon: float) -> Optional[float]:
        """Queries ERDDAP for SST at (lat, lon)."""
        if not self.is_sst_configured:
            return None
        dataset_id = settings.INCOIS_ERDDAP_SST_DATASET.strip()
        return await self._fetch_and_extract(dataset_id, lat, lon, "sst")

    async def get_chlorophyll(self, lat: float, lon: float) -> Optional[float]:
        """Queries ERDDAP for Chlorophyll-a at (lat, lon)."""
        if not self.is_chl_configured:
            return None
        dataset_id = settings.INCOIS_ERDDAP_CHL_DATASET.strip()
        return await self._fetch_and_extract(dataset_id, lat, lon, "chl")

    async def get_sst_series(self, lat: float, lon: float, days: int) -> List[Dict[str, Any]]:
        """
        Queries ERDDAP for SST daily mean timeseries over past N days.
        Returns list of {"date": "YYYY-MM-DD", "value": float | None}.
        """
        if not self.is_sst_configured:
            return []
        dataset_id = settings.INCOIS_ERDDAP_SST_DATASET.strip()
        url = f"{self.base_url}/griddap/{dataset_id}.json"
        client = get_client()
        try:
            response = await client.get(url, timeout=settings.HTTP_TIMEOUT_S)
            if response.status_code >= 400:
                raise ProviderError(f"HTTP {response.status_code} from ERDDAP endpoint {url}")
            data = response.json()
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(f"ERDDAP timeseries request failed for {url}: {exc}") from exc

        return parse_erddap_timeseries(data, lat, lon, "sst")


def parse_erddap_timeseries(data: Any, lat: float, lon: float, var_type: str = "sst") -> List[Dict[str, Any]]:
    """
    Parses ERDDAP JSON response into daily mean time series:
    [{"date": "YYYY-MM-DD", "value": float | None}, ...]
    sorted by date ascending.
    """
    from collections import defaultdict

    if not isinstance(data, dict):
        return []

    if "table" not in data or not isinstance(data["table"], dict):
        return []

    table = data["table"]
    col_names = table.get("columnNames")
    rows = table.get("rows")
    if not isinstance(col_names, list) or not isinstance(rows, list) or not rows:
        return []

    cols_lower = [str(c).strip().lower() for c in col_names]
    lat_idx = _find_col_idx(cols_lower, ["latitude", "lat"])
    lon_idx = _find_col_idx(cols_lower, ["longitude", "lon"])
    time_idx = _find_col_idx(cols_lower, ["time", "timestamp", "date"])

    if var_type == "sst":
        var_idx = _find_col_idx(cols_lower, ["sst", "sea_surface_temperature", "temp", "temperature"])
    else:
        var_idx = _find_col_idx(cols_lower, ["chlorophyll_a", "chlorophyll", "chl"])

    if var_idx is None:
        coord_indices = {lat_idx, lon_idx, time_idx} - {None}
        remaining = [i for i in range(len(cols_lower)) if i not in coord_indices]
        if len(remaining) == 1:
            var_idx = remaining[0]

    if time_idx is None or var_idx is None:
        return []

    req_len = max(time_idx, var_idx) + 1
    daily_values: Dict[str, List[float]] = defaultdict(list)
    null_dates: set = set()

    for r in rows:
        if len(r) < req_len:
            continue
        raw_t = str(r[time_idx]) if r[time_idx] is not None else ""
        date_str = raw_t[:10]
        val = r[var_idx]
        if len(date_str) == 10 and date_str[4] == "-" and date_str[7] == "-":
            if val is not None:
                try:
                    daily_values[date_str].append(float(val))
                except (ValueError, TypeError):
                    null_dates.add(date_str)
            else:
                null_dates.add(date_str)

    all_dates = sorted(set(daily_values.keys()) | null_dates)
    points = []
    for d in all_dates:
        vals = daily_values.get(d, [])
        mean_val = round(sum(vals) / len(vals), 2) if vals else None
        points.append({"date": d, "value": mean_val})

    return points


async def get_authoritative_ocean_enrichment(
    lat: float,
    lon: float,
    provider: Optional[ErddapProvider] = None,
) -> Dict[str, Any]:
    """
    Factory returning:
    {
        "sst_c": float | None,
        "chlorophyll_mg_m3": float | None,
        "tags": [str...]
    }
    where tags contains "incois:erddap(sst)" / "incois:erddap(chl)" ONLY for values actually obtained.
    Never raises.
    """
    prov = provider or ErddapProvider()
    sst_val: Optional[float] = None
    chl_val: Optional[float] = None
    tags: List[str] = []

    if prov.is_sst_configured:
        try:
            val = await prov.get_sst(lat, lon)
            if val is not None:
                sst_val = float(val)
                tags.append("incois:erddap(sst)")
        except ProviderError as pe:
            logger.warning("ErddapProvider SST fetch failed: %s", pe)
        except Exception as exc:
            logger.warning("ErddapProvider SST unexpected error: %s", exc)

    if prov.is_chl_configured:
        try:
            val = await prov.get_chlorophyll(lat, lon)
            if val is not None:
                chl_val = float(val)
                tags.append("incois:erddap(chl)")
        except ProviderError as pe:
            logger.warning("ErddapProvider CHL fetch failed: %s", pe)
        except Exception as exc:
            logger.warning("ErddapProvider CHL unexpected error: %s", exc)

    return {
        "sst_c": sst_val,
        "chlorophyll_mg_m3": chl_val,
        "tags": tags,
    }
