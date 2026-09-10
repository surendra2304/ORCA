import asyncio
import json
import logging
import re
import time
from typing import Any, AsyncGenerator, Dict, Optional, Tuple
import uuid
import os
from fastapi import FastAPI, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
import uvicorn

from app.config import settings
from app.core.memory import memory
from app.core.rules import VESSEL_CLASSES
from app.core.runner import run_graph_streaming, utc_iso_now
from app.core.sessions import sessions
from app.graph.build_graph import run_graph
from app.api_dashboard import router as dashboard_router

logger = logging.getLogger(__name__)

app = FastAPI(title="ORCA API", version=settings.VERSION)
app.include_router(dashboard_router)

# Allow the Vite dev server (port 3000/5173), any localhost origin, and Render cloud domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store of past runs keyed by run_id and session_id (capped at 100 entries)
past_runs: Dict[str, Dict[str, Any]] = {}


class QueryRequest(BaseModel):
    text: str = Field(..., description="User query text")
    session_id: Optional[str] = Field(None, description="Optional session ID to continue an ongoing conversation")
    language: Optional[str] = Field("en", description="ISO 639-1 language code")
    vessel_class: Optional[str] = Field("small_fishing_boat", description="Vessel class for safety rules")
    mode: Optional[str] = Field(None, description="Execution mode: mock | real")
    sync: Optional[bool] = Field(None, description="Optional sync flag in body")
    lat: Optional[float] = Field(None, description="Optional user latitude")
    lon: Optional[float] = Field(None, description="Optional user longitude")
    location_name: Optional[str] = Field(None, description="Optional user location or port name")


@app.get("/health")
async def health_check():
    """
    Health check endpoint returning application status and LLM configuration flags.
    Never exposes raw API keys.
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "mock_mode": settings.MOCK_MODE,
        "gemini_configured": settings.gemini_configured,
        "groq_configured": settings.groq_configured,
    }


@app.post("/query")
async def query_endpoint(req: QueryRequest, sync: bool = False):
    """
    Reasoning query endpoint.
    Contract v1.2:
    - run_id is unique per run.
    - session_id connects multiple conversational turns (omitted = new session; provided = continue conversation).
    - In async mode (default), starts graph as BACKGROUND task and returns {"session_id", "run_id", "mode", "language", "verdict": None}.
    - In sync mode (?sync=true), executes synchronously and returns full result JSON with run_id and detected language.
    """
    vessel_class = req.vessel_class or "small_fishing_boat"
    if vessel_class not in VESSEL_CLASSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid vessel_class '{vessel_class}'. Valid options: {VESSEL_CLASSES}",
        )

    effective_mode = req.mode if req.mode is not None else ("mock" if settings.MOCK_MODE else "real")
    if effective_mode not in ("mock", "real"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{effective_mode}'. Valid options: ['mock', 'real']",
        )

    is_sync = sync or bool(req.sync)
    session_id = req.session_id or str(uuid.uuid4())
    run_id = str(uuid.uuid4())

    # Register run and update latest mapping
    t0 = time.time()
    sessions.create_run(run_id=run_id, session_id=session_id)
    print(f"[DEBUG] create_run: {(time.time()-t0)*1000:.1f}ms")

    if is_sync:
        final_state, duration_ms = await run_graph(
            query=req.text,
            language=req.language or "en",
            session_id=session_id,
            run_id=run_id,
            vessel_class=vessel_class,
            mode=effective_mode,
            lat=req.lat,
            lon=req.lon,
            location_name=req.location_name,
        )

        detected_lang = final_state.get("language", req.language or "en")

        result = {
            "session_id": session_id,
            "run_id": run_id,
            "mode": effective_mode,
            "language": detected_lang,
            "verdict": final_state.get("verdict"),
            "plan": {
                "needed_agents": final_state.get("needed_agents", []),
                "execution_plan": final_state.get("execution_plan", []),
                "safety_relevant": final_state.get("safety_relevant", True),
                "language": detected_lang,
                "entity_source": final_state.get("entity_source", "query"),
            },
            "agent_outputs": final_state.get("agent_outputs", {}),
            "final_answer": final_state.get("final_answer", ""),
            "trace": final_state.get("trace", []),
            "duration_ms": duration_ms,
        }

        # Maintain in-memory cap of 100 entries
        if len(past_runs) >= 100:
            oldest_key = next(iter(past_runs))
            del past_runs[oldest_key]
        past_runs[run_id] = result
        past_runs[session_id] = result

        # Store envelopes in session manager with run_id
        for entry in final_state.get("trace", []):
            seq = sessions.next_seq(run_id)
            raw_type = entry.get("event", "unknown")
            etype = "final_answer" if raw_type == "answer" else raw_type
            envelope = {
                "run_id": run_id,
                "seq": seq,
                "ts": entry.get("ts") or utc_iso_now(),
                "type": etype,
                "payload": dict(entry.get("data") or {}),
            }
            if entry.get("agent") and "agent" not in envelope["payload"]:
                envelope["payload"]["agent"] = entry["agent"]
            sessions.store_event(run_id, envelope)
        sessions.mark_finished(run_id)

        return result

    # Asynchronous streaming execution (default)
    # Immediately emit run_started envelope for run_id
    t1 = time.time()
    run_started_envelope = {
        "run_id": run_id,
        "seq": sessions.next_seq(run_id),
        "ts": utc_iso_now(),
        "type": "run_started",
        "payload": {
            "query": req.text,
            "session_id": session_id,
            "run_id": run_id,
            "vessel_class": vessel_class,
            "mode": effective_mode,
        },
    }
    sessions.store_event(run_id, run_started_envelope)
    sessions.publish(run_id, run_started_envelope)
    print(f"[DEBUG] store+publish: {(time.time()-t1)*1000:.1f}ms")

    # Launch background reasoning workflow
    t2 = time.time()
    asyncio.create_task(
        run_graph_streaming(
            session_id=session_id,
            run_id=run_id,
            query=req.text,
            language=req.language or "en",
            sessions=sessions,
            vessel_class=vessel_class,
            mode=effective_mode,
            lat=req.lat,
            lon=req.lon,
            location_name=req.location_name,
        )
    )
    print(f"[DEBUG] create_task: {(time.time()-t2)*1000:.1f}ms")

    result = {
        "session_id": session_id,
        "run_id": run_id,
        "mode": effective_mode,
        "language": req.language or "en",
        "verdict": None,
    }
    print(f"[DEBUG] total /query: {(time.time()-t0)*1000:.1f}ms")
    return result


@app.get("/stream/{target_id}")
async def stream_endpoint(target_id: str, request: Request):
    """
    Streams execution trace events live as Server-Sent Events (SSE).
    target_id can be either a specific run_id or a session_id:
    - If run_id: streams that exact run.
    - If session_id: streams the latest run for that session.
    Closes immediately after run_complete.
    Supports full replay for late subscribers or completed runs.
    """
    if not sessions.session_exists(target_id):
        raise HTTPException(status_code=404, detail=f"Session/Run not found: {target_id}")

    target_run_id = sessions.resolve_run_id(target_id)
    queue = sessions.register_subscriber(target_run_id)

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        sent_seq = 0
        try:
            # 1. Yield replayed events already stored for this run
            stored_events = sessions.get_events(target_run_id)
            for envelope in stored_events:
                if envelope["seq"] > sent_seq:
                    sent_seq = envelope["seq"]
                    yield ServerSentEvent(
                        event=envelope["type"],
                        data=json.dumps(envelope),
                    )
                    if envelope["type"] == "run_complete":
                        return

            # 2. Yield live events
            while True:
                if await request.is_disconnected():
                    break

                try:
                    envelope = await asyncio.wait_for(queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    if sessions.is_finished(target_run_id) and queue.empty():
                        for rem_envelope in sessions.get_events(target_run_id):
                            if rem_envelope["seq"] > sent_seq:
                                sent_seq = rem_envelope["seq"]
                                yield ServerSentEvent(
                                    event=rem_envelope["type"],
                                    data=json.dumps(rem_envelope),
                                )
                        break
                    continue

                if envelope["seq"] <= sent_seq:
                    continue

                sent_seq = envelope["seq"]
                yield ServerSentEvent(
                    event=envelope["type"],
                    data=json.dumps(envelope),
                )

                if envelope["type"] == "run_complete":
                    break
        finally:
            sessions.unregister_subscriber(target_run_id, queue)

    return EventSourceResponse(
        event_generator(),
        ping=15,
        ping_message_factory=lambda: ServerSentEvent(comment="ping"),
    )


@app.get("/run/{run_id}/trace")
async def get_run_trace(run_id: str):
    """
    Returns full trace envelope history for a specific run from memory or disk.
    404 if run is unknown.
    """
    events = sessions.get_events(run_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")

    session_id = events[0].get("payload", {}).get("session_id", run_id) if events else run_id
    return {
        "run_id": run_id,
        "session_id": session_id,
        "event_count": len(events),
        "events": events,
    }


@app.get("/sessions/{session_id}")
async def get_session_details(session_id: str):
    """
    Returns the multi-turn session record (turns summary) from memory or disk.
    404 if session is unknown.
    """
    session_data = memory.get_session_dict(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return session_data


# ─── Broadcast-Grade Neural TTS (edge-tts) ────────────────────────────────────
VOICE_MAP = {
    "te": "te-IN-ShrutiNeural",       # Telugu (India) Female
    "hi": "hi-IN-SwaraNeural",        # Hindi (India) Female
    "en": "en-IN-NeerjaNeural",       # Indian English Female
    "ta": "ta-IN-PallaviNeural",      # Tamil (India) Female
    "bn": "bn-IN-TanishaaNeural",     # Bengali (India) Female
    "mr": "mr-IN-AarohiNeural",       # Marathi (India) Female
    "gu": "gu-IN-DhwaniNeural",       # Gujarati (India) Female
    "kn": "kn-IN-SapnaNeural",        # Kannada (India) Female
    "ml": "ml-IN-SobhanaNeural",      # Malayalam (India) Female
}

try:
    import edge_tts
except ImportError:
    edge_tts = None

tts_cache: Dict[Tuple[str, str], bytes] = {}


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize")
    language: Optional[str] = Field("en", description="ISO language code (te, hi, en, ta, etc.)")


async def generate_tts_bytes(text: str, language: str = "en") -> bytes:
    clean_text = re.sub(r"https?://\S+", "", text)

    # Auto-detect language from script to avoid pronouncing Indic text with English voice
    if re.search(r"[\u0C00-\u0C7F]", clean_text):
        lang_code = "te"
    elif re.search(r"[\u0900-\u097F]", clean_text):
        lang_code = "hi"
    elif re.search(r"[\u0B80-\u0BFF]", clean_text):
        lang_code = "ta"
    elif re.search(r"[\u0980-\u09FF]", clean_text):
        lang_code = "bn"
    else:
        lang_code = (language or "en").lower()[:2]

    # Map raw English machine verdict tokens and strip robotic labels for natural human speech
    if lang_code == "te":
        clean_text = re.sub(r"^(నిర్ణయం|తీర్పు)\s*[:\-–]?\s*", "", clean_text, flags=re.I)
        clean_text = re.sub(r"\b(నిర్ణయం)\s*[:\-–]?\s*", "", clean_text, flags=re.I)
        clean_text = re.sub(r"\b(NO[-_ ]?GO|NOGO)\b:?", "వేటకు వెళ్లవద్దు.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bCAUTION\b:?", "జాగ్రత్తగా ఉండండి.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bGO\b:?", "సురక్షితం.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bUNKNOWN\b:?", "సమాచారం సరిపోలేదు.", clean_text, flags=re.I)
    elif lang_code == "hi":
        clean_text = re.sub(r"^(निर्णय)\s*[:\-–]?\s*", "", clean_text, flags=re.I)
        clean_text = re.sub(r"\b(निर्णय)\s*[:\-–]?\s*", "", clean_text, flags=re.I)
        clean_text = re.sub(r"\b(NO[-_ ]?GO|NOGO)\b:?", "यात्रा न करें.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bCAUTION\b:?", "सावधानी बरतें.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bGO\b:?", "सुरक्षित है.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bUNKNOWN\b:?", "जानकारी अपर्याप्त है.", clean_text, flags=re.I)
    elif lang_code == "ta":
        clean_text = re.sub(r"^(தீர்ப்பு)\s*[:\-–]?\s*", "", clean_text, flags=re.I)
        clean_text = re.sub(r"\b(தீர்ப்பு)\s*[:\-–]?\s*", "", clean_text, flags=re.I)
        clean_text = re.sub(r"\b(NO[-_ ]?GO|NOGO)\b:?", "கடலுக்கு செல்ல வேண்டாம்.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bCAUTION\b:?", "எச்சரிக்கை.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bGO\b:?", "பாதுகாப்பானது.", clean_text, flags=re.I)
        clean_text = re.sub(r"\bUNKNOWN\b:?", "தகவல் போதாது.", clean_text, flags=re.I)
    elif lang_code == "en":
        clean_text = re.sub(r"^(Verdict|Safety Verdict)\s*[:\-–]?\s*", "", clean_text, flags=re.I)
        clean_text = re.sub(r"\b(NO[-_ ]?GO|NOGO)\b:?", "No-Go.", clean_text, flags=re.I)

    clean_text = re.sub(r"[*#_`~\[\]()]", "", clean_text)
    clean_text = re.sub(r"\s+", " ", clean_text).strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Empty text provided for TTS")

    voice = VOICE_MAP.get(lang_code, "en-IN-NeerjaNeural")

    cache_key = (clean_text, voice)
    if cache_key in tts_cache:
        return tts_cache[cache_key]

    if edge_tts is None:
        raise HTTPException(status_code=503, detail="TTS service unavailable (edge_tts not installed)")

    try:
        communicate = edge_tts.Communicate(clean_text, voice)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])

        if not audio_data:
            raise HTTPException(status_code=500, detail="No audio returned from TTS engine")

        audio_bytes = bytes(audio_data)
        if len(tts_cache) >= 150:
            tts_cache.pop(next(iter(tts_cache)))
        tts_cache[cache_key] = audio_bytes
        return audio_bytes
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"TTS synthesis error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {exc}")


@app.get("/api/tts")
async def tts_get(text: str = Query(..., max_length=2500), language: Optional[str] = Query("en")):
    """
    Returns broadcast-grade neural audio (MP3) for spoken text in Telugu, Hindi, Indian English, etc.
    """
    audio_bytes = await generate_tts_bytes(text, language or "en")
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": "inline",
        },
    )


@app.post("/api/tts")
async def tts_post(req: TTSRequest):
    """
    POST version of TTS endpoint for longer query responses.
    """
    audio_bytes = await generate_tts_bytes(req.text, req.language or "en")
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": "inline",
        },
    )



# ---------------------------------------------------------------------------
# SPA Static File Serving & Client-Side Routing
# ---------------------------------------------------------------------------
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
if os.path.isdir(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"app": settings.APP_NAME, "version": settings.VERSION, "docs": "/docs", "health": "/health"}

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not intercept API or documentation endpoints
        if full_path.startswith(("api", "query", "stream", "health", "docs", "openapi.json", "redoc", "run", "sessions")):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="SPA index not found")
else:
    @app.get("/")
    async def root_fallback():
        return {"app": settings.APP_NAME, "version": settings.VERSION, "docs": "/docs", "health": "/health"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


