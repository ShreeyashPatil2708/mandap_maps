import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.core.limiter import limiter
from app.models.schemas import ChatRequest, ChatResponse
from app.core.rag_pipeline import answer_query, stream_answer
from app.core import memory

logger = logging.getLogger("ekdanta.api")
settings = get_settings()

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def chat(request: Request, payload: ChatRequest):
    try:
        return await answer_query(payload.session_id, payload.query, payload.language)
    except Exception:
        # Log the real cause server-side; never leak internals to the client.
        logger.exception("chat pipeline failed for session=%s", payload.session_id)
        raise HTTPException(status_code=500, detail="Chat service is temporarily unavailable.")


@router.post("/stream")
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def chat_stream(request: Request, payload: ChatRequest):
    """Streams the answer as plain text chunks (Server-Sent-Events-style,
    one chunk per `yield`) so the frontend can render tokens as they
    arrive instead of waiting for the full answer. Existing /api/chat
    (non-streaming) endpoint is unchanged, so current frontend code keeps
    working; switch to this endpoint when you're ready to update the UI
    to consume a stream (e.g. with fetch + ReadableStream, or EventSource
    for true SSE framing)."""
    async def event_generator():
        try:
            async for token in stream_answer(payload.session_id, payload.query, payload.language):
                yield token
        except Exception:
            logger.exception("streaming chat pipeline failed for session=%s", payload.session_id)
            yield "\n[Chat service is temporarily unavailable.]"

    return StreamingResponse(event_generator(), media_type="text/plain")


@router.delete("/{session_id}")
async def clear_session(session_id: str):
    await memory.clear_history(session_id)
    return {"status": "cleared", "session_id": session_id}


@router.get("/{session_id}/history")
async def get_session_history(session_id: str):
    return {"session_id": session_id, "history": await memory.get_history(session_id)}
