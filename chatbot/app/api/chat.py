import logging

from fastapi import APIRouter, HTTPException, Request

from app.config import get_settings
from app.core import memory
from app.core.limiter import limiter
from app.core.rag_pipeline import answer_query
from app.models.schemas import ChatRequest, ChatResponse

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


@router.delete("/{session_id}")
async def clear_session(session_id: str):
    memory.clear_history(session_id)
    return {"status": "cleared", "session_id": session_id}


@router.get("/{session_id}/history")
async def get_session_history(session_id: str):
    return {"session_id": session_id, "history": memory.get_history(session_id)}
