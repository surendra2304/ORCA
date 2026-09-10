import logging
import re
from typing import Any, Dict, List, Tuple

from app.graph.agents import VALID_AGENTS
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.llm.client import call_llm_json

logger = logging.getLogger(__name__)

CANONICAL_AGENTS = ["weather", "ocean", "pfz", "satellite", "hazard", "geospatial", "route"]

FALLBACK_PLAN = {
    "safety_relevant": True,
    "language": "en",
    "entity_source": "query",
    "needed_agents": ["weather", "ocean", "pfz", "satellite", "hazard", "geospatial"],
    "execution_plan": [
        ["weather", "ocean", "pfz", "satellite", "hazard"],
        ["geospatial"],
    ],
    "entities": {
        "lat": None,
        "lon": None,
        "location_name": None,
        "date_hint": None,
        "origin": None,
        "destination": None,
    },
}

PLANNER_SYSTEM_PROMPT = """You are ORCA Planner, an expert coordinator for marine reasoning in the Indian Ocean.
Analyze the user query, determine the required agents, extract relevant entities, detect the query language, and formulate an execution plan.

Conversation & Multi-turn Context:
- You are handling turn N of an ongoing conversation. Prior turns are provided when available.
- Resolve conversational references: "there", "same place", "what if I leave earlier", "what's the weather like there" refer to the most recent turn's location and context.
- Entities: If the latest query explicitly names a location or coordinates, extract them and set entity_source = "query". If it does NOT name one but prior turns established one, INHERIT lat, lon, and location_name from the most recent turn and set entity_source = "inherited"; otherwise entity_source = "query" with unknown fields null.
- Coordinates Rule: In entities, lat and lon MUST be null unless the query explicitly states numerical coordinates (e.g. '17.70 N, 83.30 E' or '8.0, 90.0'). NEVER guess or invent numerical coordinates for named locations (like 'Visakhapatnam' or 'Kakinada'); put the name in location_name and keep lat and lon null.

Language Detection:
- Detect the language of the LATEST user query. Return it as an ISO 639-1 two-letter code in "language" (e.g. en, hi, te, ta, bn, mr, gu, kn, ml, or, pa, ur, ...).
- Respond-to language = latest query language, even if earlier turns were in another language.
- Distinguish Hindi ('hi') vs Marathi ('mr'): Hindi uses words like 'कैसी', 'है', 'क्या', 'की', 'हालत'; Marathi uses 'कशी', 'आहे', 'काय'. A query like 'समुद्र की हालत कैसी है?' is Hindi ('hi').

Safety Determination:
- safety_relevant: boolean flag.
  * true when the query asks about going to sea, safety, trip feasibility, operational or navigation status, vessel safety status, or weather/ocean hazards ("Is it safe to fish?", "Can I sail tomorrow?", "what is my status?", "what is my safety status?").
  * false when the query asks purely about informational locations, finding PFZ zones, navigation distances to ports, pure weather observation, or route advisory without asking about safety or sailing feasibility (e.g., "Where is the nearest PFZ near Kakinada?", "What is the distance to Chennai port?", "What is the weather there?", "What is the safest route from Chennai to Puducherry?").

Available Agents:
- weather: Meteorological forecast, wind speed, gusts, precipitation, lightning risk.
- ocean: Ocean state forecast, wave heights, swell, sea surface temperature, tides, and currents.
- pfz: Potential Fishing Zone advisories, fish aggregation coordinates, depth, and confidence.
- satellite: Earth observation satellite imagery, chlorophyll-a concentration, SST anomalies.
- geospatial: Navigational distance and bearing calculations, restricted zones, and EEZ boundary checks. MUST be included whenever coordinates, locations, navigation, or boundary status are checked.
- hazard: Coastal warnings, high wave alerts, storm surges, and weather advisories.
- route: Safe route advisory between two named coastal points (needs origin AND destination).

Dependency Rules:
- If both pfz and geospatial are needed, geospatial MUST be in a later batch than pfz (because geospatial needs PFZ zone coordinates).
- If route is needed, weather and ocean MUST also be included in needed_agents, and route MUST be in a strictly later batch than weather AND ocean:
  needed_agents: ["weather", "ocean", "route"]
  execution_plan: [["weather", "ocean"], ["route"]]
  entities: {"lat": null, "lon": null, "location_name": null, "date_hint": "tomorrow", "origin": "Chennai", "destination": "Puducherry"}
- Every agent in needed_agents MUST appear in execution_plan exactly once across all batches. Total agents in execution_plan must match needed_agents exactly.
- lat and lon MUST be float numbers or null. NEVER use strings like "unknown".

You MUST return ONLY valid JSON matching this exact structure:
{
  "safety_relevant": true,
  "language": "en",
  "entity_source": "query",
  "needed_agents": ["weather", "ocean", "pfz", "satellite", "geospatial", "hazard"],
  "execution_plan": [["weather", "ocean", "pfz", "satellite", "hazard"], ["geospatial"]],
  "entities": {
    "lat": null,
    "lon": null,
    "location_name": "Visakhapatnam",
    "date_hint": "tomorrow",
    "origin": null,
    "destination": null
  }
}
"""


def validate_plan(payload: Any) -> Tuple[bool, List[str]]:
    """
    Pure-python validator for planner outputs.
    Returns (is_valid, list_of_error_messages).
    """
    errors: List[str] = []

    if not isinstance(payload, dict):
        return False, ["Payload must be a JSON object (dict)."]

    # 1. needed_agents validation
    needed = payload.get("needed_agents")
    is_safety = payload.get("safety_relevant", True)
    if not isinstance(needed, list):
        errors.append("needed_agents must be a list of agent strings.")
    elif len(needed) == 0 and is_safety:
        errors.append("needed_agents must be a non-empty list for safety-relevant queries.")
    elif len(needed) > 0:
        unknown = [a for a in needed if a not in VALID_AGENTS]
        if unknown:
            errors.append(f"needed_agents contains unknown agents: {unknown}")

    # 2. execution_plan validation
    plan = payload.get("execution_plan")
    if not isinstance(plan, list):
        errors.append("execution_plan must be a list of batches (lists).")
    elif len(plan) == 0 and is_safety:
        errors.append("execution_plan must be a non-empty list of batches for safety-relevant queries.")
    elif isinstance(needed, list) and len(needed) > 0:
        seen_agents = []
        for i, batch in enumerate(plan):
            if not isinstance(batch, list) or len(batch) == 0:
                errors.append(f"execution_plan batch {i} must be a non-empty list.")
                continue
            for agent in batch:
                if agent not in needed:
                    errors.append(
                        f"execution_plan contains agent '{agent}' not declared in needed_agents."
                    )
                seen_agents.append(agent)

        # Check each agent in needed_agents appears exactly once across all batches
        for a in needed:
            count = seen_agents.count(a)
            if count == 0:
                errors.append(f"Agent '{a}' declared in needed_agents is missing from execution_plan.")
            elif count > 1:
                errors.append(
                    f"Agent '{a}' appears {count} times across execution_plan batches; must appear exactly once."
                )

        if len(seen_agents) != len(needed):
            errors.append(
                f"Total agents in execution_plan ({len(seen_agents)}) does not match needed_agents ({len(needed)})."
            )

        # 3. Dependency rule: geospatial must be in later batch than pfz if both present
        if "pfz" in needed and "geospatial" in needed:
            pfz_batch = -1
            geo_batch = -1
            for idx, batch in enumerate(plan):
                if isinstance(batch, list):
                    if "pfz" in batch:
                        pfz_batch = idx
                    if "geospatial" in batch:
                        geo_batch = idx

            if pfz_batch != -1 and geo_batch != -1:
                if geo_batch <= pfz_batch:
                    errors.append(
                        f"Dependency violation: geospatial (batch {geo_batch}) must be in a strictly later batch than pfz (batch {pfz_batch})."
                    )

        # 3b. Dependency rule: route must be in later batch than weather AND ocean
        if "route" in needed and any(a in needed for a in ("weather", "ocean")):
            route_batch = -1
            prior_batches = []
            for idx, batch in enumerate(plan):
                if isinstance(batch, list):
                    if "route" in batch:
                        route_batch = idx
                    for a in ("weather", "ocean"):
                        if a in batch:
                            prior_batches.append((a, idx))

            if route_batch != -1:
                for a, a_idx in prior_batches:
                    if route_batch <= a_idx:
                        errors.append(
                            f"Dependency violation: route (batch {route_batch}) must be in a strictly later batch than {a} (batch {a_idx})."
                        )

    # 4. entities validation & coercion
    entities = payload.get("entities")
    if not isinstance(entities, dict):
        errors.append("entities must be a dict.")
    else:
        for coord in ("lat", "lon"):
            val = entities.get(coord)
            if val is not None:
                if isinstance(val, str) and val.strip().lower() in ("unknown", "null", "none", "", "n/a"):
                    entities[coord] = None
                    continue
                try:
                    entities[coord] = float(val)
                except (ValueError, TypeError):
                    errors.append(f"Entity '{coord}' must be a number or null; got {repr(val)}.")

        for text_key in ("location_name", "date_hint"):
            val = entities.get(text_key)
            if val is not None and not isinstance(val, str):
                errors.append(f"Entity '{text_key}' must be a string or null; got {repr(val)}.")

        # Validate optional origin and destination objects
        for endpoint_key in ("origin", "destination"):
            endpoint_val = entities.get(endpoint_key)
            if endpoint_val is not None:
                if isinstance(endpoint_val, str):
                    endpoint_val = {
                        "name": endpoint_val,
                        "location_name": endpoint_val,
                        "lat": None,
                        "lon": None,
                    }
                    entities[endpoint_key] = endpoint_val
                elif not isinstance(endpoint_val, dict):
                    errors.append(f"Entity '{endpoint_key}' must be an object (dict), string, or null; got {repr(endpoint_val)}.")
                else:
                    for coord in ("lat", "lon"):
                        c_val = endpoint_val.get(coord)
                        if c_val is not None:
                            try:
                                endpoint_val[coord] = float(c_val)
                            except (ValueError, TypeError):
                                errors.append(f"Entity '{endpoint_key}.{coord}' must be a number or null; got {repr(c_val)}.")
                    name_val = endpoint_val.get("name") or endpoint_val.get("location_name")
                    if name_val is not None and not isinstance(name_val, str):
                        errors.append(f"Entity '{endpoint_key}.name' must be a string or null; got {repr(name_val)}.")
                    elif name_val is not None:
                        endpoint_val["name"] = name_val
                        endpoint_val["location_name"] = name_val

    # 5. language validation
    lang = payload.get("language")
    if not lang or not isinstance(lang, str) or len(lang.strip()) != 2:
        payload["language"] = "en"
    else:
        payload["language"] = lang.strip().lower()

    # 6. entity_source validation
    es = payload.get("entity_source")
    if es is not None and es not in ("query", "inherited"):
        errors.append(f"entity_source must be 'query' or 'inherited'; got {repr(es)}.")
    elif es is None:
        payload["entity_source"] = "query"

    # 7. safety_relevant validation & fail-safe default
    sr = payload.get("safety_relevant")
    if not isinstance(sr, bool):
        payload["safety_relevant"] = True

    return len(errors) == 0, errors


async def planner_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Planner LangGraph node.
    Emits run_started and plan_created live via TraceCollector.
    Returns state updates for safety_relevant, language, entity_source, needed_agents, execution_plan, and entities.
    """
    query = state.get("query", "")
    session_id = state.get("session_id", "")
    run_id = state.get("run_id", session_id)
    history = state.get("history") or []

    # Emit run_started immediately
    await collector.emit(
        "run_started",
        None,
        {
            "query": query,
            "session_id": session_id,
            "run_id": run_id,
            "vessel_class": state.get("vessel_class", "small_fishing_boat"),
            "mode": state.get("mode", "real"),
        },
    )

    clean_q = query.strip().lower()
    words = clean_q.split()
    is_greeting = False
    is_thanks = False

    if len(words) <= 4 and re.search(r"^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|howdy)\b", clean_q):
        is_greeting = True
    elif len(query.strip().split()) <= 4 and re.search(r"^(నమస్కారం|నమస్తే|హలో|హాయ్|బాగున్నారా|ఎలా ఉన్నారు)", query.strip()):
        is_greeting = True
    elif len(query.strip().split()) <= 4 and re.search(r"^(नमस्ते|नमस्कार|हेलो|हाय|कैसे हो|क्या हाल है)", query.strip()):
        is_greeting = True
    elif len(query.strip().split()) <= 4 and re.search(r"^(வணக்கம்|ஹலோ|ஹாய்)", query.strip()):
        is_greeting = True
    elif len(query.strip().split()) <= 4 and re.search(r"^(নমস্কার|হ্যালো|হাই)", query.strip()):
        is_greeting = True
    elif len(words) <= 5 and re.search(r"^(who are you|what are you|what can you do|help me|నువ్వు ఎవరు|तुम कौन हो)\b", clean_q):
        is_greeting = True
    elif len(words) <= 4 and re.search(r"^(thanks|thank you|ধন্যবাদ|ధన్యవాదాలు|धन्यवाद|நன்றி)\b", clean_q):
        is_thanks = True

    if is_greeting or is_thanks:
        lang = state.get("language") or "en"
        if re.search(r"[\u0C00-\u0C7F]", query):
            lang = "te"
        elif re.search(r"[\u0900-\u097F]", query):
            lang = "hi"
        elif re.search(r"[\u0B80-\u0BFF]", query):
            lang = "ta"
        elif re.search(r"[\u0980-\u09FF]", query):
            lang = "bn"

        await collector.emit(
            "plan_created",
            None,
            {
                "needed_agents": [],
                "execution_plan": [],
                "safety_relevant": False,
                "language": lang,
                "entity_source": "query",
            },
        )
        init_e = dict(state.get("entities") or {})
        return {
            "safety_relevant": False,
            "language": lang,
            "entity_source": "query",
            "needed_agents": [],
            "execution_plan": [],
            "entities": {
                "lat": init_e.get("lat"),
                "lon": init_e.get("lon"),
                "location_name": init_e.get("location_name"),
                "date_hint": None,
                "origin": None,
                "destination": None,
            },
        }

    _COASTAL_LOC_MAP = {
        "visakhapatnam": (17.6868, 83.2185, "Visakhapatnam Harbor"),
        "vizag": (17.6868, 83.2185, "Visakhapatnam Harbor"),
        "విశాఖపట్నం": (17.6868, 83.2185, "Visakhapatnam Harbor"),
        "వైజాగ్": (17.6868, 83.2185, "Visakhapatnam Harbor"),
        "kakinada": (16.9891, 82.2475, "Kakinada Port"),
        "కాకినాడ": (16.9891, 82.2475, "Kakinada Port"),
        "bhimavaram": (16.5449, 81.5212, "Bhimavaram"),
        "భీమవరం": (16.5449, 81.5212, "Bhimavaram"),
        "antarvedi": (16.3268, 81.7289, "Antarvedi Coast"),
        "అంతర్వేది": (16.3268, 81.7289, "Antarvedi Coast"),
        "machilipatnam": (16.1875, 81.1389, "Machilipatnam Port"),
        "మచిలీపట్నం": (16.1875, 81.1389, "Machilipatnam Port"),
        "nizampatnam": (15.9062, 80.6682, "Nizampatnam Port"),
        "నిజాంపట్నం": (15.9062, 80.6682, "Nizampatnam Port"),
        "krishnapatnam": (14.2500, 80.1167, "Krishnapatnam Port"),
        "chennai": (13.0827, 80.2707, "Chennai Port"),
        "చెన్నై": (13.0827, 80.2707, "Chennai Port"),
        "mumbai": (18.9438, 72.8354, "Mumbai Port"),
        "मुम्बई": (18.9438, 72.8354, "Mumbai Port"),
        "kolkata": (22.5726, 88.3639, "Kolkata Port"),
        "কলকাতা": (22.5726, 88.3639, "Kolkata Port"),
        "kochi": (9.9312, 76.2673, "Cochin Port"),
        "cochin": (9.9312, 76.2673, "Cochin Port"),
        "puri": (19.8135, 85.8312, "Puri"),
        "paradip": (20.3165, 86.6114, "Paradip Port"),
        "mangalore": (12.9141, 74.8560, "Mangalore Port"),
        "mangaluru": (12.9141, 74.8560, "Mangalore Port"),
        "tuticorin": (8.7642, 78.1348, "VO Chidambaranar Port (Tuticorin)"),
        "puducherry": (11.9416, 79.8083, "Puducherry"),
    }

    # ── Instant Safety Check Fast-Path ────────────────────────────────────────
    # Common questions like "Can I go to sea now?", "ఇప్పుడు నేను సముద్రంలోకి వెళ్లొచ్చా?", "Is it safe to fish?"
    # bypass the slow LLM planner and immediately run weather, ocean, and hazard agents in parallel!
    _QUICK_SAFETY_PATTERNS = [
        r"\b(can\s+(i|we)|should\s+(i|we)|may\s+(i|we)|is\s+it\s+safe)\s+(to\s+)?(go|sail|fish|head\s+out|leave)\b",
        r"\b(safe\s+to\s+fish|fishing\s+safety|safety\s+check)\b",
        r"(సముద్రంలోకి|వేటకు|సముద్రం|వేట)\s*(వెళ్లొచ్చా|వెళ్లవచ్చా|పోవచ్చా|వెళ్లవచ్చ|వెళ్లొచ్చ|సురక్షితమేనా|సురక్షితమా)",
        r"(సురక్షితమేనా|సురక్షితమా)",
        r"(क्या\s+समुद्र\s+में\s+जा\s+सकते|मछली\s+पकड़\s+सकते|समुद्र\s+में\s+जाना\s+सुरक्षित|सुरक्षित\s+है)",
        r"(கடலுக்குச்\s+செல்லலாமா|மீன்பிடிக்க\s+போகலாமா|பாதுகாப்பானதா)",
    ]
    is_quick_safety = any(re.search(p, query, re.I) for p in _QUICK_SAFETY_PATTERNS)
    if is_quick_safety and not re.search(r"\b(route|corridor|passage|pfz|zone)\b", clean_q, re.I):
        lang = state.get("language") or "en"
        if re.search(r"[\u0C00-\u0C7F]", query):
            lang = "te"
        elif re.search(r"[\u0900-\u097F]", query):
            lang = "hi"
        elif re.search(r"[\u0B80-\u0BFF]", query):
            lang = "ta"
        elif re.search(r"[\u0980-\u09FF]", query):
            lang = "bn"

        entities = dict(state.get("entities") or {})
        lat = entities.get("lat")
        lon = entities.get("lon")
        loc_name = entities.get("location_name")

        for k_name, (k_lat, k_lon, k_disp) in _COASTAL_LOC_MAP.items():
            if re.search(r"\b" + re.escape(k_name) + r"\b", clean_q, re.I) or k_name in query:
                lat = k_lat
                lon = k_lon
                loc_name = k_disp
                break

        if lat is None or lon is None:
            lat = 17.6868
            lon = 83.2185
            loc_name = loc_name or "Visakhapatnam Harbor"

        await collector.emit(
            "plan_created",
            None,
            {
                "needed_agents": ["weather", "ocean", "hazard"],
                "execution_plan": [["weather", "ocean", "hazard"]],
                "safety_relevant": True,
                "language": lang,
                "entity_source": "fast_path",
            },
        )
        return {
            "safety_relevant": True,
            "language": lang,
            "entity_source": "fast_path",
            "needed_agents": ["weather", "ocean", "hazard"],
            "execution_plan": [["weather", "ocean", "hazard"]],
            "entities": {
                "lat": lat,
                "lon": lon,
                "location_name": loc_name,
                "date_hint": None,
                "origin": None,
                "destination": None,
            },
        }

    # ── Instant Weather & Forecast Fast-Path ─────────────────────────────────
    # Questions about weather, forecasts, winds, waves, or sea conditions
    # e.g., "how is the weather today?", "ఈరోజు వాతావరణం ఎలా ఉంది?", "आज का मौसम कैसा है?", "வானிலை அறிக்கை"
    # immediately dispatch weather, ocean, and hazard agents without slow LLM planner delay!
    _QUICK_WEATHER_PATTERNS = [
        # English
        r"\b(how('s|\s+is)|what('s|\s+is))\s+(the\s+)?(weather|forecast|wind|waves?|temperature|rain|climate)\b",
        r"\b(weather|forecast|weather\s*report|wind\s*speed|wave\s*height|sea\s*conditions?|sea\s*state)\b",
        # Telugu (Indic scripts - NO \b!)
        r"(వాతావరణం|వాతావరణ|వాతావరణ\s*నివేదిక|గాలి\s*వేగం|అలల\s*ఎత్తు|సముద్ర\s*పరిస్థితి|వర్షం|ఎండ|చలి|తుఫాను|తుపాను)",
        # Hindi (Indic scripts - NO \b!)
        r"(मौसम|पूर्वानुमान|मौसम\s*की\s*जानकारी|हवा\s*की\s*गति|लहरों\s*की\s*ऊंचाई|बारिश|समुद्र\s*की\s*स्थिति|तूफान)",
        # Tamil (Indic scripts - NO \b!)
        r"(வானிலை|வானிலை\s*அறிக்கை|காற்று\s*வேகம்|அலை\s*உயரம்|மழை)",
        # Bengali (Indic scripts - NO \b!)
        r"(আবহাওয়া|আবহাওয়ার\s*খবর|বাতাসের\s*গতি|ঢেউয়ের\s*উচ্চতা|বৃষ্টি)",
    ]
    is_quick_weather = any(re.search(p, query, re.I) for p in _QUICK_WEATHER_PATTERNS)
    if is_quick_weather and not re.search(r"\b(route|corridor|passage|pfz|zone)\b", clean_q, re.I):
        lang = state.get("language") or "en"
        if re.search(r"[\u0C00-\u0C7F]", query):
            lang = "te"
        elif re.search(r"[\u0900-\u097F]", query):
            lang = "hi"
        elif re.search(r"[\u0B80-\u0BFF]", query):
            lang = "ta"
        elif re.search(r"[\u0980-\u09FF]", query):
            lang = "bn"

        entities = dict(state.get("entities") or {})
        lat = entities.get("lat")
        lon = entities.get("lon")
        loc_name = entities.get("location_name")

        for k_name, (k_lat, k_lon, k_disp) in _COASTAL_LOC_MAP.items():
            if re.search(r"\b" + re.escape(k_name) + r"\b", clean_q, re.I) or k_name in query:
                lat = k_lat
                lon = k_lon
                loc_name = k_disp
                break

        if lat is None or lon is None:
            lat = 17.6868
            lon = 83.2185
            loc_name = loc_name or "Visakhapatnam Harbor"

        # Check if query also asks about sailing safety
        asks_safety = bool(
            re.search(r"\b(can\s+(i|we)|should\s+(i|we)|safe\s+to|safe\s+for|fishing\s+safety)\b", query, re.I) or
            re.search(r"(సముద్రంలోకి\s*వెళ్ల|వేటకు\s*వెళ్ల|చేపల\s*వేట|సురక్షిత|వెళ్లవచ్చా|వెళ్లొచ్చా|పోవచ్చా|क्या\s+हम\s+जा\s+सकते|जा\s*सकते|सुरक्षित)", query, re.I)
        )

        await collector.emit(
            "plan_created",
            None,
            {
                "needed_agents": ["weather", "ocean", "hazard"],
                "execution_plan": [["weather", "ocean", "hazard"]],
                "safety_relevant": asks_safety,
                "language": lang,
                "entity_source": "fast_path",
            },
        )
        return {
            "safety_relevant": asks_safety,
            "language": lang,
            "entity_source": "fast_path",
            "needed_agents": ["weather", "ocean", "hazard"],
            "execution_plan": [["weather", "ocean", "hazard"]],
            "entities": {
                "lat": lat,
                "lon": lon,
                "location_name": loc_name,
                "date_hint": None,
                "origin": None,
                "destination": None,
            },
        }

    # ── General-knowledge fast-path (no marine agents needed) ─────────────────
    # Detect factual questions that don't require any marine data agents.
    # These are answered instantly by the aggregator using a direct LLM call.
    _GENERAL_KNOWLEDGE_PATTERNS = [
        r"\bwhat\s+(is|are)\s+(the\s+)?time\b",
        r"\bwhat\s+time\b",
        r"\bcurrent\s+time\b",
        r"\btime\s+(now|right\s*now|is\s+it)\b",
        r"\btime\b",
        r"\bclock\b",
        r"\bdate\b",
        r"\bdistance\b",
        r"\bhow\s+far\b",
        r"\bhow\s+many\s+km\b",
        r"\bhow\s+many\s+kilometers\b",
        r"\bhow\s+many\s+miles\b",
        r"\bcapital\s+(of|city)\b",
        r"\bwho\s+(is|was|are|were)\s+\w+\b",
        r"\bwhat\s+is\s+\w+\b",
        r"\bwhen\s+(is|was|did|will)\b",
        r"\bwhere\s+is\b",
        r"\bhow\s+(many|much|old|tall|large|big|small|long)\b",
        r"\bpopulation\s+of\b",
        r"\bpresident|prime\s*minister|chief\s*minister\b",
        r"\b(kakinada|bhimavaram|rajahmundry|vizag|visakhapatnam|vijayawada|hyderabad|guntur|tirupati)\b.*\b(kakinada|bhimavaram|rajahmundry|vizag|visakhapatnam|vijayawada|hyderabad|guntur|tirupati)\b",
        r"\b(సమయం|టైమ్|గంటలు|తేదీ)\b",
        r"\b(దూరం|కిలోమీటర్లు)\b",
        r"\b(সময়|टाइम|तारीख|दूरी|किलोमीटर)\b",
    ]
    is_general_knowledge = any(re.search(p, clean_q, re.I) for p in _GENERAL_KNOWLEDGE_PATTERNS)

    # Detect marine domain keywords (English uses \b, Indic scripts do NOT use \b)
    _ENGLISH_MARINE_KEYWORDS = (
        r"\b(sea|ocean|wave|waves|wind|winds|gust|gusts|fish|fishing|boat|vessel|sail|sailing|"
        r"coast|coastal|harbor|harbour|port|ports|tide|tides|swell|swells|storm|cyclone|pfz|eez|"
        r"restricted\s+zone|naval|safety|safe|unsafe|danger|hazard|departure|depart|trip|"
        r"go\s+out|heading\s+out|weather|marine|nautical|route|corridor|passage|navigation|waypoint)\b"
    )
    _INDIC_MARINE_KEYWORDS = (
        r"(వేట|సముద్రం|సముద్ర|అలలు|అలల|చేపలు|చేపల|నావ|పడవ|వాతావరణం|వాతావరణ|హార్బర్|పోర్టు|భద్రత|సురక్షిత|తుఫాను|తుపాను|గాలి|వర్షం|"
        r"मौसम|समुद्र|लहर|नाव|बंदरगाह|तूफान|हवा|बारिश|मछली|सुरक्षा|सुरक्षित|"
        r"வானிலை|கடல்|அலை|காற்று|மழை|மீன்பிடி|துறைமுகம்|பாதுகாப்பு|"
        r"আবহাওয়া|সমুদ্র|ঢেউ|বাতাস|বৃষ্টি|মাছ|বন্দর|নিরাপত্তা)"
    )
    is_marine_query = bool(re.search(_ENGLISH_MARINE_KEYWORDS, clean_q, re.I) or re.search(_INDIC_MARINE_KEYWORDS, query))

    # If it is not a marine query at all or pure general knowledge, route instantly to General QA!
    if not is_marine_query:
        # Detect language from script
        lang = state.get("language") or "en"
        if re.search(r"[\u0C00-\u0C7F]", query):
            lang = "te"
        elif re.search(r"[\u0980-\u09FF]", query):
            lang = "bn"
        elif re.search(r"[\u0B80-\u0BFF]", query):
            lang = "ta"
        elif re.search(r"[\u0900-\u097F]", query):
            lang = "hi"

        await collector.emit(
            "plan_created",
            None,
            {
                "needed_agents": [],
                "execution_plan": [],
                "safety_relevant": False,
                "language": lang,
                "entity_source": "query",
            },
        )
        init_e = dict(state.get("entities") or {})
        return {
            "safety_relevant": False,
            "language": lang,
            "entity_source": "query",
            "needed_agents": [],
            "execution_plan": [],
            "entities": {
                "lat": init_e.get("lat"),
                "lon": init_e.get("lon"),
                "location_name": init_e.get("location_name"),
                "date_hint": None,
                "origin": None,
                "destination": None,
            },
        }

    history_lines = []
    if history:
        for idx, turn in enumerate(history[-10:], 1):
            t_q = turn.get("query", "")
            t_l = turn.get("language", "en")
            t_e = turn.get("entities") or {}
            t_loc = t_e.get("location_name") or "None"
            t_lat = t_e.get("lat")
            t_lon = t_e.get("lon")
            t_coords = f"({t_lat}, {t_lon})" if t_lat is not None and t_lon is not None else "coords=None"
            t_v = turn.get("verdict_summary") or "None"
            history_lines.append(
                f"- Turn {idx}: Query=\"{t_q}\", Lang={t_l}, Location={t_loc} {t_coords}, Verdict={t_v}"
            )

    history_digest = "\n".join(history_lines) if history_lines else "None (first turn in conversation)"
    init_e = dict(state.get("entities") or {})
    curr_lat = init_e.get("lat")
    curr_lon = init_e.get("lon")
    curr_loc = init_e.get("location_name")
    user_loc_str = f"{curr_loc} (Coordinates: {curr_lat}, {curr_lon})" if curr_loc or curr_lat else "Unknown"

    prompt = (
        f"Conversation History (most recent turns):\n{history_digest}\n\n"
        f"User's Known Live Location: {user_loc_str}\n"
        f"User Query: {query}\n"
        f"Provide the safety_relevant flag, detected query language (2-letter ISO code), "
        f"entity_source ('query' or 'inherited'), needed agents, execution plan, and entities."
    )

    # Attempt 1
    raw_plan = None
    is_valid = False
    errors: List[str] = []

    try:
        raw_plan = await call_llm_json(prompt=prompt, system=PLANNER_SYSTEM_PROMPT)
        is_valid, errors = validate_plan(raw_plan)
    except Exception as exc:
        errors = [f"LLM call or JSON parsing failed: {exc}"]

    # Attempt 2 (retry once with feedback)
    if not is_valid:
        logger.warning("Planner attempt 1 failed validation: %s. Retrying once...", errors)
        retry_prompt = (
            f"User Query: {query}\n\n"
            f"Your previous output was invalid for the following reasons:\n"
            + "\n".join(f"- {e}" for e in errors)
            + "\n\nPlease fix the plan and return valid JSON following the schema and dependency rules exactly."
        )
        try:
            raw_plan = await call_llm_json(prompt=retry_prompt, system=PLANNER_SYSTEM_PROMPT)
            is_valid, errors = validate_plan(raw_plan)
        except Exception as exc:
            errors.append(f"Retry LLM call failed: {exc}")

    if not is_valid or not isinstance(raw_plan, dict):
        logger.warning(
            "Planner attempt 2 also failed validation (%s). Using fallback plan.",
            errors,
        )
        if re.search(r"\broute\b", query, re.I):
            final_plan = {
                "safety_relevant": False,
                "language": "en",
                "entity_source": "query",
                "needed_agents": ["weather", "ocean", "route"],
                "execution_plan": [["weather", "ocean"], ["route"]],
                "entities": {
                    "lat": None,
                    "lon": None,
                    "location_name": None,
                    "date_hint": None,
                    "origin": "Chennai",
                    "destination": "Puducherry",
                },
            }
        else:
            final_plan = dict(FALLBACK_PLAN)
    else:
        final_plan = raw_plan

    safety_relevant = final_plan.get("safety_relevant", True)
    language = final_plan.get("language", "en")

    # Detect Indic script directly from query text to ensure accurate language tagging
    if re.search(r"[\u0980-\u09FF]", query):
        language = "bn"
    elif re.search(r"[\u0C00-\u0C7F]", query):
        language = "te"
    elif re.search(r"[\u0B80-\u0BFF]", query):
        language = "ta"
    elif re.search(r"[\u0900-\u097F]", query):
        if re.search(r"\b(कशी|आहे|काय)\b", query):
            language = "mr"
        else:
            language = "hi"

    entity_source = final_plan.get("entity_source", "query")
    needed_agents = list(final_plan["needed_agents"])
    execution_plan = [list(b) for b in final_plan["execution_plan"]]
    entities = dict(final_plan.get("entities") or {})

    # If the current plan did not detect a new location from text, preserve from initial state
    init_entities = state.get("entities") or {}
    if entities.get("lat") is None and entities.get("lon") is None:
        if init_entities.get("lat") is not None and init_entities.get("lon") is not None:
            entities["lat"] = init_entities["lat"]
            entities["lon"] = init_entities["lon"]
    if not entities.get("location_name") and init_entities.get("location_name"):
        entities["location_name"] = init_entities.get("location_name")

    # Ensure entity_source and inheritance are consistently tracked across conversational turns
    if history:
        last_turn = history[-1]
        last_entities = last_turn.get("entities") or {}
        curr_loc = entities.get("location_name")
        last_loc = last_entities.get("location_name")
        if last_loc:
            # If current query doesn't introduce a new location name and has relative or missing location
            if not curr_loc:
                entities.update(last_entities)
                entity_source = "inherited"
            elif last_loc.lower() == str(curr_loc).lower() and last_loc.lower() not in query.lower():
                entity_source = "inherited"

    # Deterministic safety_relevant check for pure weather informational queries
    if re.match(r"^\s*(what('s| is)|how('s| is))\s+(the\s+)?weather\b", query, re.I):
        safety_relevant = False

    # Deterministic safety_relevant check for pure route advisory queries
    if re.search(r"\broute\s+from\b|\bsafest\s+route\b", query, re.I) and not re.search(r"\bis\s+it\s+safe\s+to\s+(fish|sail|go)\b", query, re.I):
        safety_relevant = False


    # Guarantee geospatial is scheduled if explicit coordinates, EEZ, or restricted zone keywords are present
    has_coords_or_zone = bool(re.search(r"\b\d+(\.\d+)?\s*°?\s*[NS]\b|\b\d+(\.\d+)?\s*°?\s*[EW]\b|coordinates|latitude|longitude|restricted|naval|exclusion|boundary|eez", query, re.I))
    if has_coords_or_zone and "geospatial" not in needed_agents:
        needed_agents.append("geospatial")
        execution_plan.append(["geospatial"])


    # Emit plan_created immediately
    await collector.emit(
        "plan_created",
        None,
        {
            "safety_relevant": safety_relevant,
            "language": language,
            "entity_source": entity_source,
            "needed_agents": needed_agents,
            "execution_plan": execution_plan,
            "entities": entities,
        },
    )

    return {
        "safety_relevant": safety_relevant,
        "language": language,
        "entity_source": entity_source,
        "needed_agents": needed_agents,
        "execution_plan": execution_plan,
        "entities": entities,
    }

