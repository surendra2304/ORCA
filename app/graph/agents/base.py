import asyncio
import logging
import os
import random
from typing import Any, Dict

from app.graph.state import ORCAState
from app.graph.trace import TraceCollector

logger = logging.getLogger(__name__)


class MockAgent:
    """
    Base class for ORCA mock data agents.
    Simulates latency, guarantees safe error-handling, and emits event traces
    live via the TraceCollector at the moment each event occurs.
    """
    name: str = "base"
    description: str = "Base mock agent"

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        """Subclasses override this method with specific mock logic."""
        raise NotImplementedError

    def summarize(self, payload: Dict[str, Any]) -> str:
        """Generates a concise 1-sentence summary of the result for the event trace."""
        return f"{self.name.capitalize()} mock data generated successfully."

    async def run(self, emit: TraceCollector, state: ORCAState) -> Dict[str, Any]:
        """
        Executes the agent, emits agent_started immediately, simulates latency,
        runs work safely, emits agent_result immediately, and returns the payload dict.
        Never raises unhandled exceptions.
        """
        # 1. Immediately emit agent_started
        try:
            await emit.emit("agent_started", self.name, {})
        except Exception as exc:
            logger.error("Error emitting agent_started for %s: %s", self.name, exc)

        # 2. Simulate realistic network/data retrieval latency (0.5s to 1.0s)
        await asyncio.sleep(random.uniform(0.5, 1.0))

        # 3. Perform agent work wrapped in error envelope
        try:
            force_fail = os.getenv("ORCA_FORCE_AGENT_FAILURE", "").strip().lower()
            if force_fail and force_fail == self.name.lower():
                raise RuntimeError(f"Forced agent failure via ORCA_FORCE_AGENT_FAILURE for {self.name}")

            payload = await self.execute(state)
            if state.get("mode") == "real" and self.name not in ("weather", "ocean"):
                src = payload.get("source", f"mock:{self.name}")
                if not src.endswith(":mock"):
                    payload["source"] = f"{src}:mock"
            status = "ok"
            summary = self.summarize(payload)
            source = payload.get("source", f"mock:{self.name}")
        except Exception as exc:
            logger.error("Agent %s encountered error: %s", self.name, exc, exc_info=True)
            status = "error"
            summary = f"Agent execution failed: {exc}"
            source = f"mock:{self.name}"
            if state.get("mode") == "real" and self.name not in ("weather", "ocean"):
                source = f"{source}:mock"
            payload = {"status": "error", "summary": summary, "source": source}

        # 4. Immediately emit agent_result
        try:
            await emit.emit(
                "agent_result",
                self.name,
                {"status": status, "summary": summary, "source": source},
            )
        except Exception as exc:
            logger.error("Error emitting agent_result for %s: %s", self.name, exc)

        return payload
