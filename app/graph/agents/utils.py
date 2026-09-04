import asyncio
import time
from typing import Any

async def run_mock_agent(agent_name: str, config: dict, mock_data: dict) -> dict:
    """
    Helper function to run a mock agent.
    Pushes start/done events to the SSE queue and returns the trace/output.
    """
    start_event = {
        "event": "agent_start",
        "agent": agent_name,
        "timestamp": time.time(),
        "data": {}
    }
    
    queue = config.get("configurable", {}).get("queue")
    
    if queue:
        await queue.put(start_event)
        
    await asyncio.sleep(1.0)
    
    done_event = {
        "event": "agent_done",
        "agent": agent_name,
        "timestamp": time.time(),
        "data": mock_data
    }
    
    if queue:
        await queue.put(done_event)
        
    return {
        "output": mock_data,
        "trace": [start_event, done_event]
    }
