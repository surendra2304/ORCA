import asyncio
import logging
import random
from typing import Any, Dict, List, Tuple

from app.graph.state import ORCAState, create_event

logger = logging.getLogger(__name__)


class MockAgent:
    """
    Base class for ORCA mock data agents.
    Simulates latency, guarantees safe error-handling, and emits event traces.
    """
    name: str = "base"
    description: str = "Base mock agent"

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        """Subclasses override this method with specific mock logic."""
        raise NotImplementedError

    def summarize(self, payload: Dict[str, Any]) -> str:
        """Generates a concise 1-sentence summary of the result for the event trace."""
        return f"{self.name.capitalize()} mock data generated successfully."

    async def run(self, state: ORCAState) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Executes the agent, emits agent_started and agent_result events,
        and returns (payload, [events]). Never raises exceptions.
        """
        events: List[Dict[str, Any]] = [
            create_event("agent_started", agent=self.name, data={})
        ]

        # Simulate realistic network/data retrieval latency (0.5s to 1.0s)
        await asyncio.sleep(random.uniform(0.5, 1.0))

        try:
            payload = await self.execute(state)
            status = "ok"
            summary = self.summarize(payload)
            source = payload.get("source", f"mock:{self.name}")
        except Exception as exc:
            logger.error("Agent %s encountered error: %s", self.name, exc, exc_info=True)
            status = "error"
            summary = f"Agent execution failed: {exc}"
            source = f"mock:{self.name}"
            payload = {"status": "error", "summary": summary, "source": source}

        events.append(
            create_event(
                "agent_result",
                agent=self.name,
                data={"status": status, "summary": summary, "source": source},
            )
        )

        return payload, events
