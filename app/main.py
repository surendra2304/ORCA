from fastapi import FastAPI, BackgroundTasks, HTTPException
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import asyncio
import uuid
import json

from app.graph.build_graph import build_orca_graph

app = FastAPI(title="ORCA Phase 0")
graph = build_orca_graph()

session_queues: dict[str, asyncio.Queue] = {}

class QueryRequest(BaseModel):
    text: str
    language: str = "en"

async def run_graph_task(session_id: str, query: str, language: str):
    queue = session_queues[session_id]
    config = {"configurable": {"session_id": session_id, "queue": queue}}
    
    try:
        await graph.ainvoke({"query": query, "language": language}, config)
    except Exception as e:
        print(f"Graph execution failed: {e}")
        await queue.put({"event": "error", "data": str(e)})
    finally:
        # Signal the stream to end
        await queue.put(None)

@app.post("/query")
async def query_endpoint(req: QueryRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    session_queues[session_id] = asyncio.Queue()
    
    background_tasks.add_task(run_graph_task, session_id, req.text, req.language)
    
    return {"session_id": session_id}

@app.get("/stream/{session_id}")
async def stream_endpoint(session_id: str):
    if session_id not in session_queues:
        raise HTTPException(status_code=404, detail="Session not found")
        
    queue = session_queues[session_id]
    
    async def event_generator():
        try:
            while True:
                event = await queue.get()
                if event is None: # Terminal sentinel
                    break
                yield {"data": json.dumps(event)}
        finally:
            if session_id in session_queues:
                del session_queues[session_id]
                
    return EventSourceResponse(event_generator())
