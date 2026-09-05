import asyncio
import logging
from typing import Any, Dict, List, Optional, Set
import uuid

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages session lifecycle, pub/sub subscriber queues, and event replay buffers.
    Supports fan-out emission to multiple concurrent listeners per session.
    """

    def __init__(self, replay_cap: int = 1000) -> None:
        self.replay_cap = replay_cap
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def session_exists(self, session_id: str) -> bool:
        """Checks whether a session exists."""
        return session_id in self._sessions

    def create_session(self, session_id: Optional[str] = None) -> str:
        """
        Creates a new session record and returns its session_id.
        """
        sid = session_id or str(uuid.uuid4())
        self._sessions[sid] = {
            "session_id": sid,
            "subscribers": set(),
            "events": [],
            "finished": False,
            "seq": 0,
        }
        return sid

    def register_subscriber(self, session_id: str) -> asyncio.Queue:
        """
        Registers a new subscriber queue for the specified session.
        Raises KeyError if session does not exist.
        """
        if session_id not in self._sessions:
            raise KeyError(f"Unknown session: {session_id}")

        queue: asyncio.Queue = asyncio.Queue()
        self._sessions[session_id]["subscribers"].add(queue)
        return queue

    def unregister_subscriber(self, session_id: str, queue: asyncio.Queue) -> None:
        """
        Removes a subscriber queue from the session.
        """
        if session_id in self._sessions:
            self._sessions[session_id]["subscribers"].discard(queue)

    def publish(self, session_id: str, envelope: Dict[str, Any]) -> None:
        """
        Funnels the envelope to all active subscriber queues for this session.
        Zero subscribers is normal and handled safely.
        """
        if session_id not in self._sessions:
            return

        subscribers: Set[asyncio.Queue] = self._sessions[session_id]["subscribers"]
        for q in list(subscribers):
            try:
                q.put_nowait(envelope)
            except Exception as exc:
                logger.error("Failed to enqueue event for subscriber in session %s: %s", session_id, exc)

    def store_event(self, session_id: str, envelope: Dict[str, Any]) -> None:
        """
        Appends an envelope to the session's replay buffer, respecting the replay cap.
        """
        if session_id not in self._sessions:
            return

        events_list: List[Dict[str, Any]] = self._sessions[session_id]["events"]
        events_list.append(envelope)
        if len(events_list) > self.replay_cap:
            events_list.pop(0)

    def next_seq(self, session_id: str) -> int:
        """
        Increments and returns the next monotonically increasing sequence number (starting from 1).
        """
        if session_id not in self._sessions:
            raise KeyError(f"Unknown session: {session_id}")
        self._sessions[session_id]["seq"] += 1
        return self._sessions[session_id]["seq"]

    def mark_finished(self, session_id: str) -> None:
        """Marks the session as finished."""
        if session_id in self._sessions:
            self._sessions[session_id]["finished"] = True

    def is_finished(self, session_id: str) -> bool:
        """Returns True if the session has completed execution."""
        session = self._sessions.get(session_id)
        return bool(session and session.get("finished", False))

    def get_events(self, session_id: str) -> List[Dict[str, Any]]:
        """Returns a snapshot of all stored envelopes for replay."""
        session = self._sessions.get(session_id)
        if not session:
            return []
        return list(session.get("events", []))


# Global singleton instance
sessions = SessionManager()
