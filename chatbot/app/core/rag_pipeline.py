import logging

from starlette.concurrency import run_in_threadpool

from app.core import memory
from app.core.cache import get_cached_response, set_cached_response
from app.core.hybrid_retriever import get_retriever
from app.core.lang_detect import detect_language
from app.core.llm import build_prompt, call_llm
from app.models.schemas import ChatResponse, SourceChunk

logger = logging.getLogger("ekdanta.rag")


async def answer_query(session_id: str, query: str, language: str = "auto") -> ChatResponse:
    detected_lang = detect_language(query) if language == "auto" else language

    # Cache only "fresh" queries with no session history, so multi-turn
    # follow-ups always go through the full context-aware pipeline.
    history = memory.get_history(session_id)
    if not history:
        cached = get_cached_response(query)
        if cached:
            logger.info("cache hit for query=%r", query)
            memory.append_turn(session_id, query, cached["answer"])
            return ChatResponse(session_id=session_id, cached=True, **cached)

    retriever = get_retriever()
    # retrieve() is CPU-bound (embeddings + FAISS + BM25); run it off the event
    # loop so it doesn't block other concurrent requests.
    hits = await run_in_threadpool(retriever.retrieve, query)
    logger.info("retrieved %d chunks for query=%r", len(hits), query)

    messages = build_prompt(query, hits, history)
    answer = await call_llm(messages)

    memory.append_turn(session_id, query, answer)

    sources = [
        SourceChunk(text=h["text"][:300], source=h.get("title", h.get("doc_id", "unknown")), score=round(h["score"], 4))
        for h in hits
    ]

    payload = {
        "answer": answer,
        "sources": [s.model_dump() for s in sources],
        "detected_language": detected_lang,
    }
    if not history:
        set_cached_response(query, payload)

    return ChatResponse(session_id=session_id, **payload)
