"""
Hazard Alert Provider Chain for ORCA:
- HazardProvider: Abstract base class for marine hazard providers.
- ImdCapProvider: Fetches and parses official Common Alerting Protocol (CAP) feeds from IMD.
- IncoisAlertsProvider: Calls live INCOIS marine alerts REST API when configured.
- AdvisoryFileProvider: Loads and parses local digitized advisory JSON files.
- get_hazard_payload: Factory chain merging multi-source feeds with locked schema.
"""

from abc import ABC, abstractmethod
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import xml.etree.ElementTree as ET
import httpx

from app.config import settings
from app.tools.http import get_client

logger = logging.getLogger(__name__)


class ProviderError(Exception):
    """Raised when an external hazard alert provider encounters an error."""
    pass


class HazardProvider(ABC):
    """Abstract interface for marine hazard alert providers."""

    @abstractmethod
    async def get_alerts(
        self,
        lat: Optional[float],
        lon: Optional[float],
        date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves raw alerts from the provider.
        Each item has keys: type, severity, area, validity, headline, center, radius_km.
        (distance_km and affected are calculated downstream by HazardAgent).
        """
        raise NotImplementedError


class ImdCapProvider(HazardProvider):
    """
    Fetches and parses India Meteorological Department (IMD) Common Alerting Protocol (CAP) feed.
    Used only when settings.IMD_CAP_FEED_URL is configured.
    """

    def __init__(self, feed_url: Optional[str] = None) -> None:
        self.feed_url = feed_url or settings.IMD_CAP_FEED_URL

    async def get_alerts(
        self,
        lat: Optional[float],
        lon: Optional[float],
        date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not self.feed_url:
            return []

        headers: Dict[str, str] = {}
        if settings.IMD_API_KEY:
            headers["x-api-key"] = settings.IMD_API_KEY

        try:
            client = get_client()
            resp = await client.get(self.feed_url, headers=headers)
            if resp.status_code != 200:
                raise ProviderError(f"IMD CAP feed HTTP error: status {resp.status_code}")
        except Exception as exc:
            if isinstance(exc, ProviderError):
                raise
            raise ProviderError(f"IMD CAP request failed: {exc}") from exc

        content_type = resp.headers.get("content-type", "").lower()
        raw_text = resp.text.strip()

        # Handle JSON format if returned
        if "json" in content_type or raw_text.startswith("{") or raw_text.startswith("["):
            try:
                data = resp.json()
                return self._parse_json(data)
            except Exception as exc:
                raise ProviderError(f"Failed to parse IMD CAP JSON: {exc}") from exc

        # Handle XML format (Standard CAP 1.2)
        try:
            return self._parse_xml(raw_text)
        except Exception as exc:
            raise ProviderError(f"Failed to parse IMD CAP XML: {exc}") from exc

    def _parse_xml(self, xml_text: str) -> List[Dict[str, Any]]:
        # adapt field mapping when IMD feed access is confirmed
        root = ET.fromstring(xml_text)
        alerts: List[Dict[str, Any]] = []

        def strip_ns(tag: str) -> str:
            return tag.split("}")[-1] if "}" in tag else tag

        # Search for info blocks across any namespace
        info_elements = [el for el in root.iter() if strip_ns(el.tag) == "info"]
        if not info_elements and strip_ns(root.tag) == "info":
            info_elements = [root]

        for info in info_elements:
            event = ""
            severity = "moderate"
            area_desc = "Indian Coastal Waters"
            expires = None
            headline = None
            center: Optional[List[float]] = None
            radius_km: Optional[float] = None

            for child in info:
                t = strip_ns(child.tag)
                val = (child.text or "").strip()
                if t == "event":
                    event = val
                elif t == "severity":
                    severity = val.lower()
                elif t == "expires":
                    expires = val
                elif t == "headline":
                    headline = val
                elif t == "area":
                    for a_child in child:
                        if strip_ns(a_child.tag) == "areaDesc":
                            area_desc = (a_child.text or "").strip()
                        elif strip_ns(a_child.tag) == "circle":
                            # Format: "lat,lon radius" (radius in km)
                            parts = (a_child.text or "").strip().split()
                            if len(parts) >= 2:
                                coords = parts[0].split(",")
                                if len(coords) == 2:
                                    try:
                                        center = [float(coords[0]), float(coords[1])]
                                        radius_km = float(parts[1])
                                    except ValueError:
                                        pass
                        elif strip_ns(a_child.tag) == "polygon":
                            # Format: "lat1,lon1 lat2,lon2 ..."
                            poly_parts = (a_child.text or "").strip().split()
                            parsed_pts = []
                            for p in poly_parts:
                                coords = p.split(",")
                                if len(coords) == 2:
                                    try:
                                        parsed_pts.append((float(coords[0]), float(coords[1])))
                                    except ValueError:
                                        pass
                            if parsed_pts:
                                avg_lat = sum(pt[0] for pt in parsed_pts) / len(parsed_pts)
                                avg_lon = sum(pt[1] for pt in parsed_pts) / len(parsed_pts)
                                center = [round(avg_lat, 4), round(avg_lon, 4)]
                                radius_km = 50.0  # default polygon approximation buffer

            # Type mapping
            ev_lower = event.lower()
            if "cyclone" in ev_lower:
                mapped_type = "cyclone"
            elif "thunderstorm" in ev_lower or "lightning" in ev_lower:
                mapped_type = "lightning"
            elif "high wave" in ev_lower or "swell" in ev_lower:
                mapped_type = "high_wave"
            elif "fishermen" in ev_lower:
                mapped_type = "fishermen_warning"
            else:
                mapped_type = ev_lower.replace(" ", "_") if ev_lower else "hazard"

            # Severity mapping (normalize to low, moderate, high, extreme)
            if severity in ("extreme", "severe"):
                norm_sev = "extreme"
            elif severity in ("high", "major"):
                norm_sev = "high"
            elif severity in ("moderate", "medium"):
                norm_sev = "moderate"
            else:
                norm_sev = "low"

            alerts.append({
                "type": mapped_type,
                "severity": norm_sev,
                "area": area_desc,
                "validity": expires,
                "headline": headline or event,
                "center": center,
                "radius_km": radius_km,
            })

        return alerts

    def _parse_json(self, data: Any) -> List[Dict[str, Any]]:
        # adapt field mapping when IMD feed access is confirmed
        alerts: List[Dict[str, Any]] = []
        raw_list = data if isinstance(data, list) else data.get("alerts", data.get("warnings", []))
        for item in raw_list:
            if isinstance(item, dict):
                alerts.append({
                    "type": str(item.get("type", "hazard")).lower().replace(" ", "_"),
                    "severity": str(item.get("severity", "moderate")).lower(),
                    "area": item.get("area", "Coastal Area"),
                    "validity": item.get("validity"),
                    "headline": item.get("headline"),
                    "center": item.get("center"),
                    "radius_km": float(item["radius_km"]) if item.get("radius_km") is not None else None,
                })
        return alerts


class IncoisAlertsProvider(HazardProvider):
    """
    Fetches marine hazard alerts from INCOIS REST API.
    Used only when settings.INCOIS_ALERTS_BASE_URL is configured.
    """

    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = base_url or settings.INCOIS_ALERTS_BASE_URL

    async def get_alerts(
        self,
        lat: Optional[float],
        lon: Optional[float],
        date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        # adapt when INCOIS credentials arrive
        if not self.base_url:
            return []

        try:
            client = get_client()
            resp = await client.get(self.base_url)
            if resp.status_code != 200:
                raise ProviderError(f"INCOIS alerts API returned HTTP status {resp.status_code}")
            data = resp.json()
        except Exception as exc:
            if isinstance(exc, ProviderError):
                raise
            raise ProviderError(f"INCOIS alerts request failed: {exc}") from exc

        alerts: List[Dict[str, Any]] = []
        raw_list = (
            data.get("alerts")
            if isinstance(data, dict) and "alerts" in data
            else data.get("high_wave_alerts", [])
            if isinstance(data, dict)
            else []
        )

        for item in raw_list:
            if isinstance(item, dict):
                alerts.append({
                    "type": str(item.get("type", "high_wave")).lower().replace(" ", "_"),
                    "severity": str(item.get("severity", "moderate")).lower(),
                    "area": item.get("area", "Coastal Waters"),
                    "validity": item.get("validity"),
                    "headline": item.get("headline"),
                    "center": item.get("center"),
                    "radius_km": float(item["radius_km"]) if item.get("radius_km") is not None else None,
                })

        return alerts


class AdvisoryFileProvider(HazardProvider):
    """
    Loads digitized official hazard advisory JSON files from settings.HAZARD_ADVISORY_DIR.
    """

    def __init__(self, advisory_dir: Optional[str] = None) -> None:
        self.advisory_dir = Path(advisory_dir or settings.HAZARD_ADVISORY_DIR)

    async def get_alerts(
        self,
        lat: Optional[float],
        lon: Optional[float],
        date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not self.advisory_dir.exists() or not self.advisory_dir.is_dir():
            return []

        files = list(self.advisory_dir.glob("*.json"))
        if not files:
            return []

        candidates = []
        for fp in files:
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "advisory_date" in data:
                        candidates.append((data["advisory_date"], data))
            except Exception as exc:
                logger.warning("Error reading hazard advisory file '%s': %s", fp, exc)

        if not candidates:
            return []

        if date:
            matching = [c for c in candidates if c[0] == date]
            if matching:
                selected_data = matching[0][1]
            else:
                candidates.sort(key=lambda c: str(c[0]), reverse=True)
                selected_data = candidates[0][1]
        else:
            candidates.sort(key=lambda c: str(c[0]), reverse=True)
            selected_data = candidates[0][1]

        raw_alerts = selected_data.get("alerts", [])
        normalized: List[Dict[str, Any]] = []
        for a in raw_alerts:
            if isinstance(a, dict):
                normalized.append({
                    "type": str(a.get("type", "hazard")).lower().replace(" ", "_"),
                    "severity": str(a.get("severity", "moderate")).lower(),
                    "area": a.get("area", "Coastal Area"),
                    "validity": a.get("validity"),
                    "headline": a.get("headline"),
                    "center": a.get("center"),
                    "radius_km": float(a["radius_km"]) if a.get("radius_km") is not None else None,
                })

        return normalized

    def get_latest_metadata(self) -> Optional[Dict[str, Any]]:
        """Returns the metadata (advisory_date, advisory_id) of the latest file."""
        if not self.advisory_dir.exists() or not self.advisory_dir.is_dir():
            return None
        files = list(self.advisory_dir.glob("*.json"))
        if not files:
            return None
        candidates = []
        for fp in files:
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "advisory_date" in data:
                        candidates.append((data["advisory_date"], data))
            except Exception:
                pass
        if not candidates:
            return None
        candidates.sort(key=lambda c: str(c[0]), reverse=True)
        return candidates[0][1]


async def get_hazard_payload(
    lat: Optional[float],
    lon: Optional[float],
    date: Optional[str] = None,
    mode: str = "mock",
) -> Dict[str, Any]:
    """
    Factory function producing the locked hazard payload schema.
    - mode="mock": Returns updated mock payload with locked schema.
    - mode="real": Runs all configured providers, merges alerts, joins source tags.
    Never raises unhandled exceptions.
    """
    if mode == "mock":
        return {
            "source": "mock:IMD+INCOIS",
            "advisory_date": "2025-01-15",
            "alerts": [
                {
                    "type": "high_wave",
                    "severity": "moderate",
                    "area": "South Andhra Coast",
                    "validity": "Next 24 hours",
                    "headline": "Moderate high wave warning along South Andhra coast",
                    "center": [16.9, 82.3],
                    "radius_km": 60.0,
                    "distance_km": None,
                    "affected": None,
                },
                {
                    "type": "lightning",
                    "severity": "low",
                    "validity": "Today evening",
                    "area": "Offshore Visakhapatnam",
                    "headline": "Low lightning risk offshore Visakhapatnam",
                    "center": [17.7, 83.3],
                    "radius_km": 40.0,
                    "distance_km": None,
                    "affected": None,
                },
            ],
            "note": None,
        }

    # mode == "real"
    merged_alerts: List[Dict[str, Any]] = []
    active_sources: List[str] = []
    attempted_sources: List[str] = []
    advisory_date: Optional[str] = None

    # 1. IMD CAP Provider
    if settings.IMD_CAP_FEED_URL.strip():
        attempted_sources.append("imd:cap")
        try:
            imd_alerts = await ImdCapProvider().get_alerts(lat, lon, date)
            if imd_alerts:
                merged_alerts.extend(imd_alerts)
                active_sources.append("imd:cap")
        except Exception as exc:
            logger.warning("ImdCapProvider failed: %s", exc)

    # 2. INCOIS Alerts Provider
    if settings.INCOIS_ALERTS_BASE_URL.strip():
        attempted_sources.append("incois:alerts")
        try:
            incois_alerts = await IncoisAlertsProvider().get_alerts(lat, lon, date)
            if incois_alerts:
                merged_alerts.extend(incois_alerts)
                active_sources.append("incois:alerts")
        except Exception as exc:
            logger.warning("IncoisAlertsProvider failed: %s", exc)

    # 3. Advisory File Provider (Always attempted)
    attempted_sources.append("hazard:advisory-file")
    try:
        file_provider = AdvisoryFileProvider()
        file_alerts = await file_provider.get_alerts(lat, lon, date)
        if file_alerts:
            merged_alerts.extend(file_alerts)
            active_sources.append("hazard:advisory-file")
            meta = file_provider.get_latest_metadata()
            if meta and "advisory_date" in meta:
                advisory_date = meta["advisory_date"]
    except Exception as exc:
        logger.warning("AdvisoryFileProvider failed: %s", exc)

    # Source determination
    if active_sources:
        source_str = "+".join(active_sources)
        note = None
    elif attempted_sources:
        source_str = "+".join(attempted_sources)
        note = "no hazard advisories available; consult official IMD and INCOIS bulletins"
    else:
        source_str = "hazard:advisory-file"
        note = "no hazard advisories available; consult official IMD and INCOIS bulletins"

    # Honest empty fallback when no alerts available
    if not merged_alerts:
        return {
            "source": "hazard:advisory-file",
            "advisory_date": None,
            "alerts": [],
            "note": "no hazard advisories available; consult official IMD and INCOIS bulletins",
        }

    return {
        "source": source_str,
        "advisory_date": advisory_date,
        "alerts": merged_alerts,
        "note": note,
    }
