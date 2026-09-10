import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.core import memory
from app.core.concurrency import BusyError, acquire_slot
from app.core.limiter import limiter
from app.core.rag_pipeline import answer_query, stream_answer
from app.models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger("ekdanta.api")
settings = get_settings()

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def chat(request: Request, payload: ChatRequest):
    try:
        # Global concurrency gate: shed load with a friendly 503 rather than
        # letting concurrent inferences pile up and OOM the box (see concurrency).
        async with acquire_slot():
            return await answer_query(payload.session_id, payload.query, payload.language)
    except BusyError:
        raise HTTPException(status_code=503, detail=settings.BUSY_MESSAGE)
    except Exception:
        # Log the real cause server-side; never leak internals to the client.
        logger.exception("chat pipeline failed for session=%s", payload.session_id)
        raise HTTPException(status_code=500, detail="Chat service is temporarily unavailable.")


@router.post("/stream")
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def chat_stream(request: Request, payload: ChatRequest):
    """Streams the answer as plain text chunks (Server-Sent-Events-style,
    one chunk per `yield`) so the frontend can render tokens as they
    arrive instead of waiting for the full answer.

    The final chunk is always structured metadata (location card /
    suggested-action chips / darshan plan), prefixed with a private
    marker character the frontend splits on — see
    frontend/src/services/chatbot.js `streamChatbotMessage()`. Everything
    before that marker is answer text; everything after it is
    `JSON.parse`-able. A response that errors before any token is
    generated (rate limit, LLM outage) yields a plain-text message with
    no marker, which the frontend treats as answer-only.
    """
    async def event_generator():
        try:
            # Same concurrency gate as the non-streaming endpoint. Acquire before
            # streaming so the slot is held for the whole generation.
            async with acquire_slot():
                async for token in stream_answer(payload.session_id, payload.query, payload.language):
                    yield token
        except BusyError:
            yield settings.BUSY_MESSAGE
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
