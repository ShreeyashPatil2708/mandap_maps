import logging
from typing import AsyncIterator

from starlette.concurrency import run_in_threadpool

from app.core.hybrid_retriever import get_retriever
from app.core.llm import build_prompt, call_llm, stream_llm, translate_to_english
from app.core import memory
from app.core.lang_detect import detect_language
from app.core.cache import get_cached_response, set_cached_response
from app.core.entity_resolver import resolve_entities, is_broad_query
from app.models.schemas import ChatResponse, SourceChunk

logger = logging.getLogger("ekdanta.rag")

# Deterministic (non-LLM) fallback messages. Kept out of the LLM entirely so
# they can never hallucinate a wrong mandal name or a made-up suggestion —
# see transcript issues #15 (unhelpful generic fallback) and #16 (not
# distinguishing "data doesn't exist" from "retrieval failed to find it").
_FALLBACK_KNOWN_ENTITY = (
    "I have information about {name}, but not an answer to that specific "
    "question. You could ask about their aarti timings, history, address, "
    "nearby food, or transport instead."
)
_FALLBACK_UNKNOWN = (
    "I can only help with Pune Ganeshotsav mandals, and I couldn't match your "
    "question to a specific one. Try including the mandal's name, e.g. "
    '"What time is Kasba Ganpati\'s morning aarti?"'
)


async def _resolve_entity_context(session_id: str, query: str, history: list[dict]):
    """Figures out which mandal(s), if any, this query is about — either
    named directly in the query, or carried forward from the last turn
    when the query looks like a follow-up (no mandal named, and not a
    deliberately broad/cross-mandal question). Returns
    (entity_doc_ids | None, primary_entity | None, retrieval_query).

    This is the fix for cross-entity contamination and broken
    coreference seen in transcripts: retrieval gets hard-restricted to
    the resolved mandal(s) instead of just being nudged toward them, and
    "What is its aarti timing?" / "What happened to the idol over the
    centuries?" correctly stay attached to whichever mandal was
    discussed most recently.
    """
    entities = resolve_entities(query)
    if entities:
        primary = entities[0]
        doc_ids = [e["doc_id"] for e in entities]
        await memory.set_last_entity(session_id, primary["doc_id"], primary["name_en"])
        return doc_ids, primary, query

    if history and not is_broad_query(query):
        last_entity = await memory.get_last_entity(session_id)
        if last_entity:
            # Prepend the canonical name so both the dense embedding and the
            # BM25 keyword match have the entity name to latch onto, since
            # the raw query ("What is its timing?") often doesn't.
            rewritten = f"{last_entity['name_en']}: {query}"
            return [last_entity["doc_id"]], last_entity, rewritten

    return None, None, query


async def answer_query(session_id: str, query: str, language: str = "auto") -> ChatResponse:
    lang_task = run_in_threadpool(detect_language, query) if language == "auto" else None

    # Cache only "fresh" queries with no session history, so multi-turn
    # follow-ups always go through the full context-aware pipeline.
    history = await memory.get_history(session_id)
    if not history:
        cached = await get_cached_response(query)
        if cached:
            logger.info("cache hit for query=%r", query)
            await memory.append_turn(session_id, query, cached["answer"])
            detected_lang = await lang_task if lang_task else language
            cached_payload = {**cached, "detected_language": cached.get("detected_language", detected_lang)}
            return ChatResponse(session_id=session_id, cached=True, **cached_payload)

    detected_lang = await lang_task if lang_task else language

    entity_doc_ids, primary_entity, retrieval_query = await _resolve_entity_context(
        session_id, query, history
    )

    # Cross-lingual retrieval fix: the dataset is in English, and the
    # multilingual embedding model retrieves noticeably worse for
    # Devanagari queries than their English equivalent. Translate before
    # embedding; the LLM still answers in the user's original language
    # because `query` (untranslated) is what goes into the final prompt.
    if detected_lang in ("mr", "hi"):
        retrieval_query = await translate_to_english(retrieval_query)

    retriever = get_retriever()
    # retrieve() is CPU-bound (embeddings + FAISS + BM25); run it off the event
    # loop so it doesn't block other concurrent requests.
    hits = await run_in_threadpool(
        retriever.retrieve, retrieval_query, top_k=None, entity_doc_ids=entity_doc_ids
    )
    logger.info(
        "retrieved %d chunks for query=%r (entity=%s)",
        len(hits), query, primary_entity["doc_id"] if primary_entity else None,
    )

    if not hits:
        # No matching context: answer deterministically instead of asking the
        # LLM to say "I don't know" (which is where fabricated example
        # questions/wrong-mandal suggestions crept in previously).
        answer = (
            _FALLBACK_KNOWN_ENTITY.format(name=primary_entity["name_en"])
            if primary_entity
            else _FALLBACK_UNKNOWN
        )
        await memory.append_turn(session_id, query, answer)
        return ChatResponse(
            session_id=session_id,
            answer=answer,
            sources=[],
            detected_language=detected_lang,
            cached=False,
        )

    messages = build_prompt(query, hits, history)
    answer = await call_llm(messages)

    await memory.append_turn(session_id, query, answer)

    sources = [
        SourceChunk(text=h["text"][:300], source=h.get("title", h.get("doc_id", "unknown")), score=round(h["score"], 4))
        for h in hits
    ]

    payload = {
        "answer": answer,
        "sources": [s.model_dump() for s in sources],
        "detected_language": detected_lang,
    }
    # Only cache fresh, entity-resolved single-mandal answers — comparison
    # queries or broad/unfiltered results are too context-dependent to reuse
    # safely across different users/sessions.
    if not history and (entity_doc_ids is None or len(entity_doc_ids) == 1):
        await set_cached_response(query, payload)

    return ChatResponse(session_id=session_id, **payload)


async def stream_answer(session_id: str, query: str, language: str = "auto") -> AsyncIterator[str]:
    """Streaming counterpart of answer_query(), used by the /stream endpoint.
    Yields answer text as it's generated instead of waiting for the full
    response. Shares the same entity resolution / translation / grounded
    fallback logic as answer_query().
    """
    lang_task = run_in_threadpool(detect_language, query) if language == "auto" else None

    history = await memory.get_history(session_id)
    detected_lang = await lang_task if lang_task else language

    entity_doc_ids, primary_entity, retrieval_query = await _resolve_entity_context(
        session_id, query, history
    )
    if detected_lang in ("mr", "hi"):
        retrieval_query = await translate_to_english(retrieval_query)

    retriever = get_retriever()
    hits = await run_in_threadpool(
        retriever.retrieve, retrieval_query, top_k=None, entity_doc_ids=entity_doc_ids
    )
    logger.info("retrieved %d chunks for query=%r (streaming)", len(hits), query)

    if not hits:
        answer = (
            _FALLBACK_KNOWN_ENTITY.format(name=primary_entity["name_en"])
            if primary_entity
            else _FALLBACK_UNKNOWN
        )
        await memory.append_turn(session_id, query, answer)
        yield answer
        return

    messages = build_prompt(query, hits, history)

    full_answer_parts: list[str] = []
    async for token in stream_llm(messages):
        full_answer_parts.append(token)
        yield token

    full_answer = "".join(full_answer_parts)
    await memory.append_turn(session_id, query, full_answer)
