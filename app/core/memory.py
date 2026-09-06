import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from app.config import settings

logger = logging.getLogger(__name__)


def utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConversationMemory:
    """
    In-memory and disk-persisted conversation memory for ORCA sessions.
    Maintains the last MEMORY_TURNS turns per session.
    Persists atomically to sessions/{session_id}.json to survive server restarts.
    """

    def __init__(self, turns_cap: Optional[int] = None, sessions_dir: Optional[str] = None) -> None:
        self.turns_cap = turns_cap or settings.MEMORY_TURNS
        self.sessions_dir = Path(sessions_dir or settings.SESSIONS_DIR)
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def _ensure_session_loaded(self, session_id: str) -> Dict[str, Any]:
        """Loads session from memory or lazily from disk."""
        if session_id in self._sessions:
            return self._sessions[session_id]

        file_path = self.sessions_dir / f"{session_id}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._sessions[session_id] = data
                    return data
            except Exception as exc:
                logger.error("Error loading session from disk '%s': %s", file_path, exc)

        now = utc_iso_now()
        new_session = {
            "session_id": session_id,
            "created_at": now,
            "updated_at": now,
            "turns": [],
        }
        self._sessions[session_id] = new_session
        return new_session

    def append_turn(self, session_id: str, turn: Dict[str, Any]) -> None:
        """
        Appends a conversational turn to the session and writes through to disk atomically.
        Turn format:
        {
            query: str,
            language: str,
            entities: {lat: Optional[float], lon: Optional[float], location_name: Optional[str]},
            safety_relevant: bool,
            verdict_summary: Optional[str],
            final_answer: str,
            run_id: str,
            ts: str
        }
        """
        session_data = self._ensure_session_loaded(session_id)
        turns_list = session_data.setdefault("turns", [])

        # Sanitize entities
        entities = turn.get("entities") or {}
        sanitized_entities = {
            "lat": float(entities["lat"]) if entities.get("lat") is not None else None,
            "lon": float(entities["lon"]) if entities.get("lon") is not None else None,
            "location_name": entities.get("location_name"),
        }

        turn_entry = {
            "query": turn.get("query", ""),
            "language": turn.get("language", "en"),
            "entities": sanitized_entities,
            "safety_relevant": bool(turn.get("safety_relevant", True)),
            "verdict_summary": turn.get("verdict_summary"),
            "final_answer": turn.get("final_answer", ""),
            "run_id": turn.get("run_id", ""),
            "ts": turn.get("ts") or utc_iso_now(),
        }

        turns_list.append(turn_entry)
        if len(turns_list) > self.turns_cap:
            turns_list.pop(0)

        session_data["updated_at"] = utc_iso_now()
        self._persist_session(session_id, session_data)

    def _persist_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """Atomically writes session data to disk."""
        try:
            self.sessions_dir.mkdir(parents=True, exist_ok=True)
            target = self.sessions_dir / f"{session_id}.json"
            tmp = self.sessions_dir / f"{session_id}.json.tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(tmp, target)
        except Exception as exc:
            logger.error("Failed to atomically persist session %s: %s", session_id, exc)

    def get_turns(self, session_id: str) -> List[Dict[str, Any]]:
        """Returns the list of turns for this session."""
        session_data = self._ensure_session_loaded(session_id)
        return list(session_data.get("turns", []))

    def last_entities(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Returns the resolved entities from the most recent turn, or None."""
        turns = self.get_turns(session_id)
        if not turns:
            return None
        last_turn = turns[-1]
        return last_turn.get("entities")

    def get_session_dict(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Returns the full session dictionary if it exists, else None."""
        file_path = self.sessions_dir / f"{session_id}.json"
        if session_id not in self._sessions and not file_path.exists():
            return None
        session_data = self._ensure_session_loaded(session_id)
        return dict(session_data)


# Global singleton instance
memory = ConversationMemory()
