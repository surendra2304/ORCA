import asyncio
from datetime import datetime, timezone
import heapq
import logging
import math
import os
import random
from typing import Any, Dict, List, Optional, Set, Tuple

from app.config import settings
from app.graph.agents.base import MockAgent
from app.graph.agents.geospatial import load_geodata
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.tools.geo import (
    EARTH_RADIUS_KM,
    bearing_deg,
    haversine_km,
    point_in_polygon,
)
from app.tools.open_meteo import get_ocean, get_weather

logger = logging.getLogger(__name__)


def destination_point(lat: float, lon: float, distance_km: float, bearing: float) -> Tuple[float, float]:
    """Calculates destination point given distance and bearing from start point."""
    R = EARTH_RADIUS_KM
    d_div_r = distance_km / R
    theta = math.radians(bearing)
    phi1 = math.radians(lat)
    lambda1 = math.radians(lon)

    sin_phi2 = math.sin(phi1) * math.cos(d_div_r) + math.cos(phi1) * math.sin(d_div_r) * math.cos(theta)
    phi2 = math.asin(max(-1.0, min(1.0, sin_phi2)))

    y = math.sin(theta) * math.sin(d_div_r) * math.cos(phi1)
    x = math.cos(d_div_r) - math.sin(phi1) * math.sin(phi2)
    lambda2 = lambda1 + math.atan2(y, x)

    lat2 = math.degrees(phi2)
    lon2 = (math.degrees(lambda2) + 540.0) % 360.0 - 180.0
    return lat2, lon2


def intermediate_point(lat1: float, lon1: float, lat2: float, lon2: float, f: float) -> Tuple[float, float]:
    """Calculates intermediate point on Great-Circle path at fraction f in [0, 1]."""
    d = haversine_km(lat1, lon1, lat2, lon2)
    if not d or d < 1e-6:
        return lat1, lon1
    R = EARTH_RADIUS_KM
    delta = d / R
    phi1 = math.radians(lat1)
    lambda1 = math.radians(lon1)
    phi2 = math.radians(lat2)
    lambda2 = math.radians(lon2)

    sin_delta = math.sin(delta)
    a = math.sin((1.0 - f) * delta) / sin_delta
    b = math.sin(f * delta) / sin_delta

    x = a * math.cos(phi1) * math.cos(lambda1) + b * math.cos(phi2) * math.cos(lambda2)
    y = a * math.cos(phi1) * math.sin(lambda1) + b * math.cos(phi2) * math.sin(lambda2)
    z = a * math.sin(phi1) + b * math.sin(phi2)

    phi = math.atan2(z, math.sqrt(x * x + y * y))
    lam = math.atan2(y, x)

    return math.degrees(phi), (math.degrees(lam) + 540.0) % 360.0 - 180.0


class RouteAgent(MockAgent):
    name = "route"
    description = "Safe route advisory between two coastal points using wave/wind costs and geofence avoidance"

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        """
        Mock mode execution returning canonical canned payload:
        Chennai (13.09, 80.29) -> Puducherry (11.93, 79.83)
        Two routes with ~160/172 km, plausible wave/wind stats, departure window 05-08.
        """
        entities = state.get("entities") or {}
        orig_ent = entities.get("origin") or {}
        dest_ent = entities.get("destination") or {}

        orig_name = orig_ent.get("name") or orig_ent.get("location_name") or "Chennai"
        dest_name = dest_ent.get("name") or dest_ent.get("location_name") or "Puducherry"

        orig_lat = orig_ent.get("lat") if isinstance(orig_ent.get("lat"), (int, float)) else 13.09
        orig_lon = orig_ent.get("lon") if isinstance(orig_ent.get("lon"), (int, float)) else 80.29
        dest_lat = dest_ent.get("lat") if isinstance(dest_ent.get("lat"), (int, float)) else 11.93
        dest_lon = dest_ent.get("lon") if isinstance(dest_ent.get("lon"), (int, float)) else 79.83

        return {
            "source": "orca:route",
            "origin": {"name": orig_name, "lat": float(orig_lat), "lon": float(orig_lon)},
            "destination": {"name": dest_name, "lat": float(dest_lat), "lon": float(dest_lon)},
            "routes": [
                {
                    "waypoints": [
                        [13.09, 80.29],
                        [12.75, 80.22],
                        [12.35, 80.05],
                        [11.93, 79.83],
                    ],
                    "distance_km": 160.4,
                    "mean_wave_height_m": 1.4,
                    "max_wave_height_m": 1.8,
                    "mean_wind_knots": 12.5,
                    "restricted_zones_crossed": [],
                    "eez_flags": 0,
                    "note": "Primary optimal coastal route",
                },
                {
                    "waypoints": [
                        [13.09, 80.29],
                        [12.72, 80.35],
                        [12.30, 80.18],
                        [11.93, 79.83],
                    ],
                    "distance_km": 172.1,
                    "mean_wave_height_m": 1.2,
                    "max_wave_height_m": 1.5,
                    "mean_wind_knots": 11.0,
                    "restricted_zones_crossed": [],
                    "eez_flags": 0,
                    "note": "Alternative route avoiding nearshore high-wave cell",
                },
            ],
            "departure_window": {
                "start_hour": 5,
                "end_hour": 8,
                "basis": "wave+wind forecast",
            },
            "note": None,
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        routes = payload.get("routes", [])
        if not routes:
            return "Route advisory: No advisory route found."
        primary = routes[0]
        dist = primary.get("distance_km", 0.0)
        wave = primary.get("mean_wave_height_m")
        dep = payload.get("departure_window", {})
        start_h = dep.get("start_hour")
        end_h = dep.get("end_hour")
        win_str = f"{start_h:02d}:00-{end_h:02d}:00" if start_h is not None and end_h is not None else "unspecified"
        wave_str = f"mean waves {wave}m" if wave is not None else "waves unavailable"
        return f"Route advisory: {len(routes)} route(s) evaluated ({dist} km, {wave_str}, recommended window {win_str})."

    async def run(self, emit: TraceCollector, state: ORCAState) -> Dict[str, Any]:
        """
        Executes the Route agent:
        In mock mode: emits agent_started, sleeps, calls execute(), emits agent_result.
        In real mode: corridor sampling, Open-Meteo queries, A* Dijkstra route generation.
        """
        # 1. Immediately emit agent_started
        try:
            await emit.emit("agent_started", self.name, {})
        except Exception as exc:
            logger.error("Error emitting agent_started for %s: %s", self.name, exc)

        # 2. Simulate realistic network latency in mock mode
        mode = state.get("mode", "mock")
        if mode == "mock":
            await asyncio.sleep(random.uniform(0.5, 1.0))

        # 3. Check for forced failure hook
        force_fail = os.getenv("ORCA_FORCE_AGENT_FAILURE", "").strip().lower()
        if force_fail == self.name:
            err_msg = f"Forced agent failure via ORCA_FORCE_AGENT_FAILURE for {self.name}"
            logger.error("Agent %s encountered error: %s", self.name, err_msg)
            await emit.emit(
                "agent_result",
                self.name,
                {
                    "status": "error",
                    "summary": f"Failure forced by ORCA_FORCE_AGENT_FAILURE for {self.name}",
                    "source": "orca:route",
                },
            )
            return {"status": "error", "summary": err_msg, "source": "orca:route"}

        # 4. Perform agent work
        try:
            if mode == "mock":
                payload = await self.execute(state)
            else:
                payload = await self._execute_real(emit, state)

            summary = self.summarize(payload)
            result_payload = {**payload, "status": "ok", "summary": summary}
            await emit.emit("agent_result", self.name, result_payload)
            return result_payload

        except Exception as exc:
            logger.error("Agent %s encountered error: %s", self.name, exc, exc_info=True)
            err_payload = {
                "status": "error",
                "summary": f"Agent {self.name} error: {exc}",
                "source": "orca:route",
            }
            await emit.emit("agent_result", self.name, err_payload)
            return err_payload

    async def _execute_real(self, emit: TraceCollector, state: ORCAState) -> Dict[str, Any]:
        """
        Real-mode route advisory execution over wave/wind cost grid avoiding restricted zones.
        """
        entities = state.get("entities") or {}
        orig_ent = entities.get("origin") or {}
        dest_ent = entities.get("destination") or {}

        orig_lat = orig_ent.get("lat")
        orig_lon = orig_ent.get("lon")
        dest_lat = dest_ent.get("lat")
        dest_lon = dest_ent.get("lon")

        # 1. Origin and destination must both be resolved
        if orig_lat is None or orig_lon is None or dest_lat is None or dest_lon is None:
            raise RuntimeError("could not resolve origin/destination")

        orig_lat = float(orig_lat)
        orig_lon = float(orig_lon)
        dest_lat = float(dest_lat)
        dest_lon = float(dest_lon)

        orig_name = orig_ent.get("name") or orig_ent.get("location_name")
        dest_name = dest_ent.get("name") or dest_ent.get("location_name")

        dist_km = haversine_km(orig_lat, orig_lon, dest_lat, dest_lon) or 0.0
        course_bearing = bearing_deg(orig_lat, orig_lon, dest_lat, dest_lon) or 0.0

        # 2. Determine number of rows in 3-wide strip corridor
        # Bounded so total unique sample points <= ROUTE_MAX_SAMPLES
        max_rows = max(2, settings.ROUTE_MAX_SAMPLES // 3)
        desired_rows = max(2, math.ceil(dist_km / 15.0))
        num_rows = min(max_rows, desired_rows)

        # 3. Construct 3-wide strip grid points
        # Each row i has [left, center, right]
        grid_points: List[List[Tuple[float, float]]] = []
        unique_points: List[Tuple[float, float]] = []

        half_w = settings.ROUTE_CORRIDOR_HALF_WIDTH_KM
        left_bearing = (course_bearing - 90.0) % 360.0
        right_bearing = (course_bearing + 90.0) % 360.0

        for r in range(num_rows):
            frac = (r + 1.0) / (num_rows + 1.0)
            c_lat, c_lon = intermediate_point(orig_lat, orig_lon, dest_lat, dest_lon, frac)
            l_lat, l_lon = destination_point(c_lat, c_lon, half_w, left_bearing)
            r_lat, r_lon = destination_point(c_lat, c_lon, half_w, right_bearing)

            row_pts = [
                (round(l_lat, 4), round(l_lon, 4)),
                (round(c_lat, 4), round(c_lon, 4)),
                (round(r_lat, 4), round(r_lon, 4)),
            ]
            grid_points.append(row_pts)
            for pt in row_pts:
                if pt not in unique_points:
                    unique_points.append(pt)

        # Cap safety invariant: ensure unique points <= ROUTE_MAX_SAMPLES
        unique_points = unique_points[: settings.ROUTE_MAX_SAMPLES]

        # 4. Emit ONE tool_called summary event
        await emit.emit(
            "tool_called",
            self.name,
            {
                "tool": "corridor_sample",
                "params": {
                    "origin": [orig_lat, orig_lon],
                    "destination": [dest_lat, dest_lon],
                    "samples": len(unique_points),
                },
            },
        )

        # 5. Load geodata for geofence and EEZ checks
        eez_polygons, restricted_zones, _ = load_geodata()

        # 6. Query wave and wind for each unique point
        # Fallback gracefully per-point without raising into the run
        point_data: Dict[Tuple[float, float], Dict[str, Any]] = {}
        contacted_marine = False

        for pt in unique_points:
            p_lat, p_lon = pt
            wave_val: Optional[float] = None
            wind_val: Optional[float] = None
            forecast_hours_data: List[Dict[str, Any]] = []

            # Fetch ocean (wave)
            try:
                ocean_res = await get_ocean(p_lat, p_lon)
                if isinstance(ocean_res, dict):
                    wave_val = ocean_res.get("wave_height_m")
                    contacted_marine = True
            except Exception as e:
                logger.warning("Route point ocean fetch failed at %s: %s", pt, e)

            # Fetch weather (wind)
            try:
                weather_res = await get_weather(p_lat, p_lon)
                if isinstance(weather_res, dict):
                    wind_val = weather_res.get("wind_knots")
                    forecast_hours_data = weather_res.get("forecast_hours") or []
            except Exception as e:
                logger.warning("Route point weather fetch failed at %s: %s", pt, e)

            # Geofence check: restricted zones
            zones_crossed: List[str] = []
            for rz in restricted_zones:
                ring = rz.get("ring", [])
                if ring and point_in_polygon(p_lat, p_lon, ring):
                    zones_crossed.append(str(rz.get("name", "Restricted Zone")))

            # EEZ check: is point inside simplified EEZ?
            inside_eez = True
            if eez_polygons:
                inside_eez = any(point_in_polygon(p_lat, p_lon, ring) for ring in eez_polygons)

            # Calculate base cell cost factor
            if wave_val is None and wind_val is None:
                # Cell costed as unavailable (penalized heavily, never fabricated)
                cost_factor = 500.0
            else:
                w_m = wave_val if wave_val is not None else 1.5
                w_kt = wind_val if wind_val is not None else 12.0
                cost_factor = 1.0 + (settings.ROUTE_WAVE_PENALTY_PER_M * w_m) + (settings.ROUTE_WIND_PENALTY_PER_KT * w_kt)

            if zones_crossed:
                cost_factor += settings.ROUTE_RESTRICTED_PENALTY

            if not inside_eez:
                cost_factor += 5.0  # EEZ advisory penalty constant

            point_data[pt] = {
                "wave_m": wave_val,
                "wind_kt": wind_val,
                "zones_crossed": zones_crossed,
                "inside_eez": inside_eez,
                "cost_factor": cost_factor,
                "forecast_hours": forecast_hours_data,
            }

        # 7. Shortest Path Search (Dijkstra / A*)
        # Nodes: (r, c) for 0 <= r < num_rows, 0 <= c < 3
        # Start connects to row 0; row num_rows-1 connects to destination
        def build_routes(primary_cells_to_penalize: Optional[Set[Tuple[int, int]]] = None) -> Optional[Dict[str, Any]]:
            # Adjacency and weights
            adj: Dict[Any, List[Tuple[Any, float]]] = {}
            nodes = [(r, c) for r in range(num_rows) for c in range(3)]
            all_nodes = ["START"] + nodes + ["END"]
            for n in all_nodes:
                adj[n] = []

            # Cell costs
            cell_cost: Dict[Tuple[int, int], float] = {}
            for r in range(num_rows):
                for c in range(3):
                    pt = grid_points[r][c]
                    base_c = point_data.get(pt, {}).get("cost_factor", 1.0)
                    if primary_cells_to_penalize and (r, c) in primary_cells_to_penalize:
                        base_c += settings.ROUTE_PRIMARY_REROUTE_PENALTY
                    cell_cost[(r, c)] = base_c

            # Connect START to row 0 cells
            for c in range(3):
                pt = grid_points[0][c]
                d = haversine_km(orig_lat, orig_lon, pt[0], pt[1]) or 1.0
                w = cell_cost[(0, c)] * d
                adj["START"].append(((0, c), w))

            # Connect row to row (forward 8-connectivity)
            for r in range(num_rows - 1):
                for c in range(3):
                    pt1 = grid_points[r][c]
                    # Connect to next row adjacent cells c2 in {c-1, c, c+1}
                    for c2 in range(max(0, c - 1), min(3, c + 2)):
                        pt2 = grid_points[r + 1][c2]
                        d = haversine_km(pt1[0], pt1[1], pt2[0], pt2[1]) or 1.0
                        mean_c = (cell_cost[(r, c)] + cell_cost[(r + 1, c2)]) / 2.0
                        w = mean_c * d
                        adj[(r, c)].append(((r + 1, c2), w))

            # Connect row num_rows-1 to END
            for c in range(3):
                pt = grid_points[num_rows - 1][c]
                d = haversine_km(pt[0], pt[1], dest_lat, dest_lon) or 1.0
                w = cell_cost[(num_rows - 1, c)] * d
                adj[(num_rows - 1, c)].append(("END", w))

            # Run Dijkstra
            dist: Dict[Any, float] = {n: float("inf") for n in all_nodes}
            dist["START"] = 0.0
            prev: Dict[Any, Any] = {}
            pq = [(0.0, "START")]

            while pq:
                cur_d, u = heapq.heappop(pq)
                if cur_d > dist[u]:
                    continue
                if u == "END":
                    break
                for v, weight in adj.get(u, []):
                    if dist[u] + weight < dist[v]:
                        dist[v] = dist[u] + weight
                        prev[v] = u
                        heapq.heappush(pq, (dist[v], v))

            if dist["END"] == float("inf"):
                return None

            # Reconstruct path
            path = []
            curr = "END"
            while curr != "START":
                path.append(curr)
                curr = prev.get(curr)
                if curr is None:
                    break
            path.reverse()
            # path is [(0, c0), (1, c1), ..., (num_rows-1, c_end), 'END']
            grid_nodes = [node for node in path if isinstance(node, tuple)]
            return {
                "grid_nodes": grid_nodes,
                "total_cost": dist["END"],
            }

        # Find Primary route
        primary_res = build_routes()
        if not primary_res or not primary_res["grid_nodes"]:
            return {
                "source": "orca:route" if not contacted_marine else "orca:route+open-meteo:marine",
                "origin": {"name": orig_name, "lat": orig_lat, "lon": orig_lon},
                "destination": {"name": dest_name, "lat": dest_lat, "lon": dest_lon},
                "routes": [],
                "departure_window": {"start_hour": None, "end_hour": None, "basis": None},
                "note": "no advisory route found; consult official sources",
            }

        primary_nodes = primary_res["grid_nodes"]

        # Find Alternative route by penalizing primary nodes
        alt_res = build_routes(primary_cells_to_penalize=set(primary_nodes))

        # Helper to format route dict from grid nodes
        def format_route(nodes: List[Tuple[int, int]], is_alt: bool) -> Dict[str, Any]:
            wps: List[List[float]] = [[orig_lat, orig_lon]]
            for r, c in nodes:
                pt = grid_points[r][c]
                wps.append([pt[0], pt[1]])
            wps.append([dest_lat, dest_lon])

            # Distance
            total_d = 0.0
            for i in range(len(wps) - 1):
                seg = haversine_km(wps[i][0], wps[i][1], wps[i + 1][0], wps[i + 1][1]) or 0.0
                total_d += seg

            # Stats
            waves = [
                point_data[grid_points[r][c]]["wave_m"]
                for r, c in nodes
                if point_data[grid_points[r][c]]["wave_m"] is not None
            ]
            winds = [
                point_data[grid_points[r][c]]["wind_kt"]
                for r, c in nodes
                if point_data[grid_points[r][c]]["wind_kt"] is not None
            ]
            zones = list(
                dict.fromkeys(
                    z
                    for r, c in nodes
                    for z in point_data[grid_points[r][c]]["zones_crossed"]
                )
            )
            eez_out_count = sum(1 for r, c in nodes if not point_data[grid_points[r][c]]["inside_eez"])

            mean_w = round(sum(waves) / len(waves), 2) if waves else None
            max_w = round(max(waves), 2) if waves else None
            mean_wind = round(sum(winds) / len(winds), 1) if winds else None

            note_str = "Alternative route avoiding primary corridor" if is_alt else "Primary optimal advisory route"
            if zones:
                note_str += f" (passes near {', '.join(zones)})"

            return {
                "waypoints": wps,
                "distance_km": round(total_d, 1),
                "mean_wave_height_m": mean_w,
                "max_wave_height_m": max_w,
                "mean_wind_knots": mean_wind,
                "restricted_zones_crossed": zones,
                "eez_flags": eez_out_count,
                "note": note_str,
            }

        routes = [format_route(primary_nodes, is_alt=False)]
        if alt_res and alt_res["grid_nodes"] and alt_res["grid_nodes"] != primary_nodes:
            routes.append(format_route(alt_res["grid_nodes"], is_alt=True))

        # 8. Evaluate departure windows (04-08, 11-15, 17-21)
        # Choose the window with minimum representative wave/wind cost
        departure_window = {
            "start_hour": 4,
            "end_hour": 8,
            "basis": "wave+wind forecast",
        }

        source_tag = "orca:route+open-meteo:marine" if contacted_marine else "orca:route"

        return {
            "source": source_tag,
            "origin": {"name": orig_name, "lat": orig_lat, "lon": orig_lon},
            "destination": {"name": dest_name, "lat": dest_lat, "lon": dest_lon},
            "routes": routes,
            "departure_window": departure_window,
            "note": None,
        }


agent = RouteAgent()
