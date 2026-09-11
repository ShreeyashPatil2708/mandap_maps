import logging

from fastapi import APIRouter, HTTPException, Path, Request
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.core import memory
from app.core.concurrency import BusyError, acquire_slot, release_slot
from app.core.limiter import limiter
from app.core.rag_pipeline import answer_query, stream_answer
from app.models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger("ekdanta.api")
settings = get_settings()

router = APIRouter(prefix="/api/chat", tags=["chat"])

_BUSY_DETAIL = "The assistant is busy right now. Please try again in a moment."


async def _acquire_or_503() -> None:
    try:
        await acquire_slot()
    except BusyError:
        raise HTTPException(status_code=503, detail=_BUSY_DETAIL) from None


@router.post("", response_model=ChatResponse)
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def chat(request: Request, payload: ChatRequest):
    await _acquire_or_503()
    try:
        return await answer_query(payload.session_id, payload.query, payload.language, payload.lat, payload.lng)
    except Exception:
        # Log the real cause server-side; never leak internals to the client.
        logger.exception("chat pipeline failed")
        raise HTTPException(status_code=500, detail="Chat service is temporarily unavailable.") from None
    finally:
        release_slot()


@router.post("/stream")
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def chat_stream(request: Request, payload: ChatRequest):
    """Streams the answer as plain text chunks (one chunk per `yield`) so the
    frontend can render tokens as they arrive instead of waiting for the full
    answer.

    The final chunk is always structured metadata (location card /
    suggested-action chips / darshan plan), prefixed with a private
    marker character the frontend splits on (see
    frontend/src/services/chatbot.js `streamChatbotMessage()`). Everything
    before that marker is answer text; everything after it is
    `JSON.parse`-able. A response that errors before any token is
    generated (busy instance, LLM outage) yields a plain-text message with no
    marker, which the frontend treats as answer-only.
    """

    async def event_generator():
        # The slot is taken inside the generator on purpose: if the client
        # disconnects before Starlette starts iterating, a never-started
        # generator never acquired anything, so nothing can leak. Once started,
        # cancellation on disconnect still runs the finally below.
        try:
            await acquire_slot()
        except BusyError:
            yield _BUSY_DETAIL
            return
        try:
            async for token in stream_answer(payload.session_id, payload.query, payload.language, payload.lat, payload.lng):
                yield token
        except Exception:
            logger.exception("streaming chat pipeline failed")
            yield "\n[Chat service is temporarily unavailable.]"
        finally:
            release_slot()

    return StreamingResponse(event_generator(), media_type="text/plain")


@router.delete("/{session_id}")
@limiter.limit(settings.CHAT_RATE_LIMIT)
async def clear_session(request: Request, session_id: str = Path(..., min_length=1, max_length=128)):
    """Forget a session's short conversational memory. Called by the
    frontend's "Clear chat" before it rotates to a fresh session id."""
    await memory.clear_history(session_id)
    return {"status": "cleared"}
