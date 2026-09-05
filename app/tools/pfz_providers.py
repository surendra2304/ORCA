"""
PFZ (Potential Fishing Zone) Provider Chain:
- PFZProvider: Abstract base class for PFZ advisory providers.
- AdvisoryFileProvider: Loads and parses local digitized INCOIS advisory JSON files.
- IncoisProvider: Calls live INCOIS PFZ REST API when credentials are provided.
- get_pfz_payload: Fallback factory chain guaranteeing locked schema across mock & real modes.
"""

from abc import ABC, abstractmethod
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings
from app.tools.http import get_client

logger = logging.getLogger(__name__)


class ProviderError(Exception):
    """Raised when an external PFZ provider fails."""
    pass


class PFZProvider(ABC):
    """Abstract interface for PFZ advisory providers."""

    @abstractmethod
    async def get_zones(
        self,
        lat: Optional[float],
        lon: Optional[float],
        date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves PFZ zones matching the locked schema:
        {
            "source": str,
            "advisory_id": str | None,
            "advisory_date": str | None,
            "zones": [
                {
                    "polygon": [[lat, lon] x >=4],
                    "depth_m": float | None,
                    "center": [lat, lon],
                    "confidence": float | None
                }
            ],
            "note": str | None
        }
        """
        raise NotImplementedError


class AdvisoryFileProvider(PFZProvider):
    """
    Loads digitized INCOIS PFZ advisory files from settings.PFZ_ADVISORY_DIR.
    Selects exact date match if date provided, else latest by advisory_date.
    Returns honest empty payload with note if directory or files are missing.
    """

    def __init__(self, advisory_dir: Optional[str] = None) -> None:
        self.advisory_dir = Path(advisory_dir or settings.PFZ_ADVISORY_DIR)

    async def get_zones(
        self,
        lat: Optional[float],
        lon: Optional[float],
        date: Optional[str] = None,
    ) -> Dict[str, Any]:
        empty_fallback = {
            "source": "incois:advisory-file",
            "advisory_id": None,
            "advisory_date": None,
            "zones": [],
            "note": "no PFZ advisory available; consult official INCOIS advisories at incois.gov.in",
        }

        if not self.advisory_dir.exists() or not self.advisory_dir.is_dir():
            logger.info("PFZ advisory directory '%s' not found.", self.advisory_dir)
            return empty_fallback

        advisory_files = list(self.advisory_dir.glob("*.json"))
        if not advisory_files:
            logger.info("No JSON advisory files found in '%s'.", self.advisory_dir)
            return empty_fallback

        candidates = []
        for file_path in advisory_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "advisory_date" in data:
                        candidates.append((data["advisory_date"], data))
            except Exception as exc:
                logger.warning("Error reading PFZ advisory file '%s': %s", file_path, exc)

        if not candidates:
            return empty_fallback

        # Filter by exact date if requested
        if date:
            matching = [c for c in candidates if c[0] == date]
            if matching:
                selected_data = matching[0][1]
            else:
                # No exact match for date -> sort by date descending and pick latest
                candidates.sort(key=lambda c: str(c[0]), reverse=True)
                selected_data = candidates[0][1]
        else:
            candidates.sort(key=lambda c: str(c[0]), reverse=True)
            selected_data = candidates[0][1]

        raw_zones = selected_data.get("zones", [])
        normalized_zones: List[Dict[str, Any]] = []
        for z in raw_zones:
            if not isinstance(z, dict):
                continue
            poly = z.get("polygon", [])
            center = z.get("center", [])
            depth = float(z["depth_m"]) if z.get("depth_m") is not None else None
            conf = float(z["confidence"]) if z.get("confidence") is not None else None
            normalized_zones.append({
                "polygon": poly,
                "depth_m": depth,
                "center": center,
                "confidence": conf,
            })

        return {
            "source": "incois:advisory-file",
            "advisory_id": str(selected_data.get("advisory_id")) if selected_data.get("advisory_id") else None,
            "advisory_date": str(selected_data.get("advisory_date")) if selected_data.get("advisory_date") else None,
            "zones": normalized_zones,
            "note": selected_data.get("note"),
        }


class IncoisProvider(PFZProvider):
    """
    Live INCOIS PFZ REST API integration.
    Only called when INCOIS_API_KEY and INCOIS_PFZ_BASE_URL are configured.
    """

    async def get_zones(
        self,
        lat: Optional[float],
        lon: Optional[float],
        date: Optional[str] = None,
    ) -> Dict[str, Any]:
        base_url = settings.INCOIS_PFZ_BASE_URL.strip()
        api_key = settings.INCOIS_API_KEY.strip()

        if not base_url or not api_key:
            raise ProviderError("INCOIS credentials not configured")

        params = {}
        if lat is not None:
            params["lat"] = str(lat)
        if lon is not None:
            params["lon"] = str(lon)
        if date:
            params["date"] = str(date)

        client = get_client()
        headers = {"apikey": api_key}

        try:
            response = await client.get(
                base_url,
                params=params,
                headers=headers,
                timeout=settings.HTTP_TIMEOUT_S,
            )
            if response.status_code >= 400:
                raise ProviderError(f"HTTP {response.status_code} from INCOIS API")

            data = response.json()
            # Note: adapt field mapping when INCOIS credentials arrive
            raw_zones = data.get("zones") or data.get("pfz_zones") or []
            normalized_zones: List[Dict[str, Any]] = []
            for z in raw_zones:
                if not isinstance(z, dict):
                    continue
                normalized_zones.append({
                    "polygon": z.get("polygon", []),
                    "depth_m": float(z["depth_m"]) if z.get("depth_m") is not None else None,
                    "center": z.get("center", []),
                    "confidence": float(z["confidence"]) if z.get("confidence") is not None else None,
                })

            return {
                "source": "incois:api",
                "advisory_id": str(data.get("advisory_id")) if data.get("advisory_id") else None,
                "advisory_date": str(data.get("advisory_date")) if data.get("advisory_date") else None,
                "zones": normalized_zones,
                "note": data.get("note"),
            }
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(f"INCOIS API request failed: {exc}") from exc


async def get_pfz_payload(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    date: Optional[str] = None,
    mode: str = "mock",
) -> Dict[str, Any]:
    """
    Factory resolving PFZ payload according to mode and provider chain:
    - mode="mock": Returns schema-locked mock payload with advisory_date=None, note=None.
    - mode="real": Tries IncoisProvider (if configured) -> AdvisoryFileProvider -> honest empty.
    Guaranteed never to raise unhandled exceptions.
    """
    if mode == "mock":
        return {
            "source": "mock:INCOIS-PFZ",
            "advisory_id": "PFZ-MOCK-001",
            "advisory_date": None,
            "zones": [
                {
                    "polygon": [
                        [16.3, 82.3],
                        [16.3, 82.7],
                        [16.7, 82.7],
                        [16.7, 82.3],
                    ],
                    "depth_m": 45.0,
                    "center": [16.5, 82.5],
                    "confidence": 0.78,
                }
            ],
            "note": None,
        }

    # mode == "real"
    if settings.INCOIS_API_KEY.strip() and settings.INCOIS_PFZ_BASE_URL.strip():
        try:
            return await IncoisProvider().get_zones(lat, lon, date)
        except ProviderError as pe:
            logger.warning("IncoisProvider failed (%s). Falling back to AdvisoryFileProvider...", pe)
        except Exception as exc:
            logger.warning("Unexpected IncoisProvider exception: %s. Falling back...", exc)

    try:
        return await AdvisoryFileProvider().get_zones(lat, lon, date)
    except Exception as exc:
        logger.error("AdvisoryFileProvider unexpected exception: %s", exc)
        return {
            "source": "incois:advisory-file",
            "advisory_id": None,
            "advisory_date": None,
            "zones": [],
            "note": "no PFZ advisory available; consult official INCOIS advisories at incois.gov.in",
        }
