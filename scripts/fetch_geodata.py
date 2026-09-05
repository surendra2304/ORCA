"""
Best-effort geodata downloader for VLIZ Marine Regions Exclusive Economic Zone (EEZ).
Downloads official EEZ boundaries, extracts Indian waters, and writes data/geo/india_eez.geojson.
On any network or parsing failure, prints an informative message and exits cleanly (exit code 0).
"""

import logging
import sys
from pathlib import Path
import httpx

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# VLIZ Marine Regions EEZ v12 WFS GeoJSON endpoint for Indian Exclusive Economic Zone
VLIZ_EEZ_URL = (
    "https://geo.vliz.be/geoserver/MarineRegions/ows"
    "?service=WFS&version=1.0.0&request=GetFeature"
    "&typeName=MarineRegions:eez"
    "&cql_filter=geoname='Indian Exclusive Economic Zone'"
    "&outputFormat=application/json"
)

TARGET_FILE = Path(__file__).resolve().parent.parent / "data" / "geo" / "india_eez.geojson"


def fetch_eez_data() -> None:
    logger.info("Attempting best-effort download of India EEZ from VLIZ Marine Regions...")
    logger.info("Endpoint: %s", VLIZ_EEZ_URL)

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(VLIZ_EEZ_URL)
            if resp.status_code != 200:
                logger.info(
                    "VLIZ server returned HTTP %d. Retaining bundled simplified EEZ boundary.",
                    resp.status_code,
                )
                sys.exit(0)

            data = resp.json()
            if not isinstance(data, dict) or "features" not in data or not data["features"]:
                logger.info("Received invalid or empty GeoJSON from VLIZ. Retaining bundled simplified EEZ.")
                sys.exit(0)

            TARGET_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(TARGET_FILE, "w", encoding="utf-8") as f:
                import json
                json.dump(data, f, indent=2)

            logger.info("Successfully saved official India EEZ boundary to '%s'.", TARGET_FILE)
            sys.exit(0)

    except Exception as exc:
        logger.info(
            "VLIZ EEZ download skipped due to network/parsing exception (%s). "
            "The bundled file data/geo/india_eez_simplified.geojson remains the guaranteed active path.",
            exc,
        )
        sys.exit(0)


if __name__ == "__main__":
    fetch_eez_data()
