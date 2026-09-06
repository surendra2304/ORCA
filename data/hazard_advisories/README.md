# Hazard Advisories

Bundled marine hazard advisories from official India Meteorological Department (IMD) and Indian National Centre for Ocean Information Services (INCOIS) bulletins.

## File Format

Files are named by advisory date: `advisory_YYYYMMDD.json` or `sample_YYYY_advisory.json`.

Schema:
```json
{
  "advisory_id": "HAZARD-IMD-INCOIS-YYYYMMDD-NN",
  "advisory_date": "YYYY-MM-DD",
  "source_url": "https://mausam.imd.gov.in/marine",
  "digitized": true,
  "alerts": [
    {
      "type": "high_wave | cyclone | lightning | fishermen_warning | swell_surge",
      "severity": "low | moderate | high | extreme",
      "area": "Human-readable coastal area description",
      "validity": "Validity window ISO string or human-readable description",
      "headline": "Brief advisory headline",
      "center": [lat, lon],
      "radius_km": 60.0
    }
  ]
}
```
