import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
import uuid

from app.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages session and run lifecycle, pub/sub subscriber queues, and event replay buffers.
    In Contract v1.2:
    - run_id is unique per run.
    - session_id represents a multi-turn conversation that groups multiple runs.
    - Envelopes are written through to runs/{run_id}.jsonl on disk for persistence across restarts.
    - Replay seamlessly loads from memory or disk.
    - Backward-compatible: /stream/{session_id} streams the latest run of that session.
    """

    def __init__(self, replay_cap: int = 1000, runs_dir: Optional[str] = None) -> None:
        self.replay_cap = replay_cap
        self.runs_dir = Path(runs_dir or settings.RUNS_DIR)
        self.runs_dir.mkdir(parents=True, exist_ok=True)
        # _runs tracks run-level state: run_id -> {session_id, subscribers, events, finished, seq}
        self._runs: Dict[str, Dict[str, Any]] = {}
        # _session_latest maps session_id -> latest run_id
        self._session_latest: Dict[str, str] = {}

    def session_exists(self, session_id: str) -> bool:
        """Checks whether a session exists (in memory, in latest map, or on disk)."""
        if session_id in self._session_latest or session_id in self._runs:
            return True
        # Check sessions directory
        sess_file = Path(settings.SESSIONS_DIR) / f"{session_id}.json"
        if sess_file.exists():
            return True
        # Check if session_id is actually a run_id
        run_file = self.runs_dir / f"{session_id}.jsonl"
        return run_file.exists()

    def resolve_run_id(self, key_id: str) -> str:
        """
        Resolves a key (which could be a run_id or a session_id) to the target run_id.
        If key_id is a run_id (in memory or runs/{key_id}.jsonl exists), returns key_id.
        If key_id is a session_id, returns its latest run_id.
        """
        if key_id in self._runs:
            return key_id

        run_file = self.runs_dir / f"{key_id}.jsonl"
        if run_file.exists():
            return key_id

        if key_id in self._session_latest:
            return self._session_latest[key_id]

        # Check sessions file on disk
        sess_file = Path(settings.SESSIONS_DIR) / f"{key_id}.json"
        if sess_file.exists():
            try:
                with open(sess_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    turns = data.get("turns", [])
                    if turns and turns[-1].get("run_id"):
                        latest_run = turns[-1]["run_id"]
                        self._session_latest[key_id] = latest_run
                        return latest_run
            except Exception as exc:
                logger.error("Error reading session file '%s': %s", sess_file, exc)

        return key_id

    def create_session(self, session_id: Optional[str] = None) -> str:
        """
        Creates a new session record or returns existing session_id.
        Maintains backward compatibility with Phase 2-6 callers.
        """
        sid = session_id or str(uuid.uuid4())
        if sid not in self._session_latest:
            self._session_latest[sid] = sid
        return sid

    def create_run(self, run_id: Optional[str] = None, session_id: Optional[str] = None) -> str:
        """
        Creates a new run record and binds it to session_id.
        """
        rid = run_id or str(uuid.uuid4())
        sid = session_id or rid
        self._runs[rid] = {
            "run_id": rid,
            "session_id": sid,
            "subscribers": set(),
            "events": [],
            "finished": False,
            "seq": 0,
        }
        self._session_latest[sid] = rid
        return rid

    def register_subscriber(self, target_id: str) -> asyncio.Queue:
        """
        Registers a new subscriber queue for the specified run_id or session_id.
        """
        rid = self.resolve_run_id(target_id)
        if rid not in self._runs:
            # Recreate memory structure if run exists on disk or as placeholder
            self._runs[rid] = {
                "run_id": rid,
                "session_id": target_id,
                "subscribers": set(),
                "events": self._load_disk_events(rid),
                "finished": self._is_disk_run_complete(rid),
                "seq": 0,
            }

        queue: asyncio.Queue = asyncio.Queue()
        self._runs[rid]["subscribers"].add(queue)
        return queue

    def unregister_subscriber(self, target_id: str, queue: asyncio.Queue) -> None:
        """Removes a subscriber queue."""
        rid = self.resolve_run_id(target_id)
        if rid in self._runs:
            self._runs[rid]["subscribers"].discard(queue)

    def publish(self, run_id: str, envelope: Dict[str, Any]) -> None:
        """
        Funnels the envelope to all active subscriber queues for this run.
        """
        if run_id not in self._runs:
            return

        subscribers: Set[asyncio.Queue] = self._runs[run_id]["subscribers"]
        for q in list(subscribers):
            try:
                q.put_nowait(envelope)
            except Exception as exc:
                logger.error("Failed to enqueue event for subscriber in run %s: %s", run_id, exc)

    def store_event(self, run_id: str, envelope: Dict[str, Any]) -> None:
        """
        Appends an envelope to the run's replay buffer and persists as JSONL to runs/{run_id}.jsonl.
        """
        if run_id not in self._runs:
            self.create_run(run_id=run_id, session_id=envelope.get("payload", {}).get("session_id"))

        events_list: List[Dict[str, Any]] = self._runs[run_id]["events"]
        events_list.append(envelope)
        if len(events_list) > self.replay_cap:
            events_list.pop(0)

        # Append to disk JSONL
        try:
            self.runs_dir.mkdir(parents=True, exist_ok=True)
            run_file = self.runs_dir / f"{run_id}.jsonl"
            with open(run_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(envelope, ensure_ascii=False) + "\n")
        except Exception as exc:
            logger.error("Failed to write envelope to %s.jsonl: %s", run_id, exc)

    def next_seq(self, run_id: str) -> int:
        """
        Increments and returns the next monotonically increasing sequence number (starting from 1).
        """
        if run_id not in self._runs:
            self.create_run(run_id=run_id)
        self._runs[run_id]["seq"] += 1
        return self._runs[run_id]["seq"]

    def mark_finished(self, run_id: str) -> None:
        """Marks the run as finished."""
        if run_id in self._runs:
            self._runs[run_id]["finished"] = True

    def is_finished(self, target_id: str) -> bool:
        """Returns True if the run has completed execution."""
        rid = self.resolve_run_id(target_id)
        if rid in self._runs:
            return bool(self._runs[rid].get("finished", False))
        return self._is_disk_run_complete(rid)

    def get_events(self, target_id: str) -> List[Dict[str, Any]]:
        """
        Returns all stored envelopes for replay from memory or disk.
        """
        rid = self.resolve_run_id(target_id)
        if rid in self._runs and self._runs[rid]["events"]:
            return list(self._runs[rid]["events"])

        disk_events = self._load_disk_events(rid)
        if disk_events:
            if rid not in self._runs:
                self._runs[rid] = {
                    "run_id": rid,
                    "session_id": disk_events[0].get("payload", {}).get("session_id", target_id),
                    "subscribers": set(),
                    "events": disk_events,
                    "finished": self._is_disk_run_complete(rid),
                    "seq": len(disk_events),
                }
            else:
                self._runs[rid]["events"] = disk_events
            return disk_events

        return []

    def _load_disk_events(self, run_id: str) -> List[Dict[str, Any]]:
        """Reads JSON lines from runs/{run_id}.jsonl."""
        run_file = self.runs_dir / f"{run_id}.jsonl"
        if not run_file.exists():
            return []
        events = []
        try:
            with open(run_file, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped:
                        events.append(json.loads(stripped))
        except Exception as exc:
            logger.error("Error reading run trace from disk '%s': %s", run_file, exc)
        return events

    def _is_disk_run_complete(self, run_id: str) -> bool:
        """Checks if runs/{run_id}.jsonl ends with run_complete."""
        events = self._load_disk_events(run_id)
        if not events:
            return False
        return any(e.get("type") == "run_complete" for e in events)


# Global singleton instance
sessions = SessionManager()
