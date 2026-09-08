# PFZ Advisories Directory

This directory stores digitized Potential Fishing Zone (PFZ) advisory files published by the Indian National Centre for Ocean Information Services (INCOIS).

## File Format

Each advisory file is stored as a JSON document with the following schema:
- `advisory_id`: Unique advisory identifier (e.g. `PFZ-INCOIS-YYYYMMDD-XX`).
- `advisory_date`: Date of validity in `YYYY-MM-DD` ISO format.
- `source_url`: Official INCOIS portal publication URL.
- `digitized`: Boolean flag indicating manual or automated GIS digitization.
- `zones`: Array of polygon objects:
  - `polygon`: Array of `[lat, lon]` boundary coordinates (minimum 4 points).
  - `depth_m`: Operational seafloor/fishing depth in meters.
  - `center`: `[lat, lon]` centroid coordinate of the advisory zone.
  - `confidence`: Estimated advisory confidence score (0.0 to 1.0).
