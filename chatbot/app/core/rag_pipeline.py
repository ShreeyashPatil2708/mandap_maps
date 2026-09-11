import logging
import os
import urllib.parse
from collections.abc import AsyncIterator

import httpx
from app.core import memory, planner
from app.core.cache import get_cached_response, set_cached_response
from app.core.entity_resolver import is_broad_query, resolve_entities
from app.core.hybrid_retriever import get_retriever
from app.core.intents import is_planner_query, wants_crowd_info, wants_photo
from app.core.lang_detect import detect_language
from app.core.llm import build_prompt, call_llm, stream_llm, translate_to_english
from app.data.loader import get_mandals
from app.models.schemas import (
    ChatResponse,
    DarshanPlan,
    LocationCard,
    PlanStop,
    SourceChunk,
    SuggestedAction,
)
from starlette.concurrency import run_in_threadpool

###### API CHANGED #####

BACKEND_URL = os.environ.get("BACKEND_URL", "https://mandapmaps.in/api")

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

_STREAM_META_MARKER = "\u0000META\u0000"  # see api/chat.py for the frontend-side split


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


async def _get_crowd_level(primary_entity: dict | None) -> dict | None:
    """Fetch current crowd information from the Node backend, looked up
    by name — the chatbot's entity registry has no numeric Postgres id,
    only doc_id/name_en/name_mr (see entity_resolver.py)."""
    if not primary_entity:
        return None

    name = primary_entity.get("name_en")
    if not name:
        logger.warning("No name_en found on entity: %s", primary_entity)
        return None

    url = f"{BACKEND_URL}/api/ganpatis/by-name/{urllib.parse.quote(name)}/crowd"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)

        if response.status_code == 404:
            logger.warning("No matching Ganpati in backend DB for name=%s", name)
            return None
        if response.status_code != 200:
            logger.warning("Crowd API returned %s for name=%s", response.status_code, name)
            return None

        return response.json()

    except Exception:
        logger.exception("Failed to fetch crowd information for name=%s", name)
        return None


async def _get_all_crowd_levels() -> list[dict]:
    """Fetch crowd levels for every mandal, for comparison-style questions
    like 'which mandal has less crowd', and to feed the Darshan Planner's
    crowd-aware ordering (see planner.build_plan)."""
    url = f"{BACKEND_URL}/api/crowd/by-name"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
        if response.status_code != 200:
            return []
        return response.json()
    except Exception:
        logger.exception("Failed to fetch all crowd levels")
        return []


def _build_crowd_comparison_answer(levels: list[dict]) -> str:
    if not levels:
        return "I don't have enough current crowd data to compare mandals right now."
    ranked = sorted(levels, key=lambda x: x["level"])
    least = [m["name"] for m in ranked if m["level"] == ranked[0]["level"]]
    most = [m["name"] for m in ranked if m["level"] == ranked[-1]["level"]]
    return (
        f"Based on current reports, {', '.join(least)} "
        f"{'has' if len(least) == 1 else 'have'} the least crowd, and "
        f"{', '.join(most)} {'has' if len(most) == 1 else 'have'} the most."
    )


def _build_location_card(primary_entity: dict | None, query: str) -> LocationCard | None:
    """Structured location payload for the map integration. Attached
    whenever a single mandal is confidently resolved and has coordinates,
    so 'View on Map' / 'Get Directions' are always available under an
    answer about a specific mandal — not just when the user explicitly
    says 'show me' (see intents.wants_location_card, used below only to
    decide whether to also attach the idol photo)."""
    if not primary_entity:
        return None
    record = next((m for m in get_mandals() if m["doc_id"] == primary_entity["doc_id"]), None)
    if not record or record["lat"] is None or record["lng"] is None:
        return None
    image_url = record.get("photo_url") if wants_photo(query) else None
    return LocationCard(
        doc_id=record["doc_id"],
        name=record["name_en"],
        latitude=record["lat"],
        longitude=record["lng"],
        maps_url=record.get("maps_link"),
        image_url=image_url,
    )


def _build_suggested_actions(primary_entity: dict | None) -> list[SuggestedAction]:
    """Contextual follow-up chips so users who don't know what else to ask
    still have an easy next step."""
    if not primary_entity:
        return [SuggestedAction(label="Plan Darshan", emoji="🛕", query="Plan my darshan route")]
    name = primary_entity["name_en"]
    return [
        SuggestedAction(label="Aarti Timings", emoji="🕐", query=f"What are the aarti timings for {name}?"),
        SuggestedAction(label="History", emoji="📜", query=f"Tell me the history of {name}"),
        SuggestedAction(label="Directions", emoji="📍", query=f"Show me {name} on the map"),
        SuggestedAction(label="Nearby Food", emoji="🍽️", query=f"What food is near {name}?"),
        SuggestedAction(label="Plan Darshan", emoji="🛕", query="Plan my darshan route"),
    ]


async def _build_plan_response(
    session_id: str, query: str, entity_doc_ids: list[str] | None,
    lat: float | None = None, lng: float | None = None,
) -> ChatResponse:
    crowd_by_name = await _get_all_crowd_levels()
    plan = planner.build_plan(query, entity_doc_ids, lat, lng, crowd_by_name)
    answer_text = planner.format_plan_text(plan)
    return ChatResponse(
        session_id=session_id,
        answer=answer_text,
        sources=[],
        detected_language="en",
        cached=False,
        plan=DarshanPlan(
            start_name=plan["start"]["name"],
            start_lat=plan["start"]["lat"],
            start_lng=plan["start"]["lng"],
            stops=[PlanStop(**s) for s in plan["stops"]],
            estimated_minutes_low=plan["estimated_minutes_low"],
            estimated_minutes_high=plan["estimated_minutes_high"],
            fits_budget=plan["fits_budget"],
        ),
        suggested_actions=[SuggestedAction(label="Explore Mandals", emoji="🕉️", query="Which mandal has the oldest idol?")],
    )


async def answer_query(
    session_id: str, query: str, language: str = "auto",
    lat: float | None = None, lng: float | None = None,
) -> ChatResponse:
    history = await memory.get_history(session_id)

    # Darshan Planner short-circuits the whole RAG/LLM path: the itinerary
    # is built deterministically from real coordinates (see planner.py),
    # so there's nothing for the LLM to add and every reason to keep it
    # out (no risk of an invented stop or wrong distance).
    if is_planner_query(query):
        entity_doc_ids, _, _ = await _resolve_entity_context(session_id, query, history)
        response = await _build_plan_response(session_id, query, entity_doc_ids, lat, lng)
        await memory.append_turn(session_id, query, response.answer)
        return response

    lang_task = run_in_threadpool(detect_language, query) if language == "auto" else None

    # Cache only "fresh" queries with no session history, so multi-turn
    # follow-ups always go through the full context-aware pipeline.
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

    # ---------------------------------------------------------
    # Crowd query — always fetch fresh crowd information.
    # Do NOT use the normal RAG cache for this.
    # ---------------------------------------------------------
    if wants_crowd_info(query):
        if not primary_entity:
            levels = await _get_all_crowd_levels()
            answer = _build_crowd_comparison_answer(levels)
            await memory.append_turn(session_id, query, answer)
            return ChatResponse(
                session_id=session_id,
                answer=answer,
                sources=[],
                detected_language=detected_lang,
                cached=False,
                location=None,
                suggested_actions=[],
            )

        crowd = await _get_crowd_level(primary_entity)

        if not crowd:
            answer = f"I don't have current crowd information for {primary_entity['name_en']}."
        else:
            label = crowd.get("label")
            level = crowd.get("level")
            if label and label != "No data yet":
                answer = (
                    f"{primary_entity['name_en']} is currently reporting "
                    f"{label} crowd levels based on recent visitor reports."
                )
            elif label:
                answer = (
                    f"{primary_entity['name_en']} is currently "
                    f"reporting crowd level {level} based on recent visitor reports."
                )
            else:
                answer = f"I don't have current crowd information for {primary_entity['name_en']}."

        await memory.append_turn(session_id, query, answer)
        return ChatResponse(
            session_id=session_id,
            answer=answer,
            sources=[],
            detected_language=detected_lang,
            cached=False,
            location=_build_location_card(primary_entity, query),
            suggested_actions=_build_suggested_actions(primary_entity),
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

    location = _build_location_card(primary_entity, query)
    suggested_actions = _build_suggested_actions(primary_entity)

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
            location=location,
            suggested_actions=suggested_actions,
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

    return ChatResponse(
        session_id=session_id, **payload, location=location, suggested_actions=suggested_actions
    )


async def stream_answer(
    session_id: str, query: str, language: str = "auto",
    lat: float | None = None, lng: float | None = None,
) -> AsyncIterator[str]:
    """Streaming counterpart of answer_query(), used by the /stream endpoint.
    Yields answer text as it's generated instead of waiting for the full
    response, then yields one final chunk carrying structured metadata
    (location card / suggested actions / plan) behind a private marker —
    see api/chat.py for how the frontend splits that back out.

    Shares the same entity resolution / translation / grounded fallback /
    cache logic as answer_query(), including the cache: previously this
    path always re-called the LLM even for a question already served (and
    cached) via the non-streaming endpoint moments earlier.
    """
    import json

    history = await memory.get_history(session_id)

    if is_planner_query(query):
        entity_doc_ids, _, _ = await _resolve_entity_context(session_id, query, history)
        response = await _build_plan_response(session_id, query, entity_doc_ids, lat, lng)
        await memory.append_turn(session_id, query, response.answer)
        yield response.answer
        yield _STREAM_META_MARKER + json.dumps(
            {"plan": response.plan.model_dump(), "suggested_actions": [a.model_dump() for a in response.suggested_actions]}
        )
        return

    lang_task = run_in_threadpool(detect_language, query) if language == "auto" else None
    detected_lang = await lang_task if lang_task else language

    if not history:
        cached = await get_cached_response(query)
        if cached:
            logger.info("cache hit for query=%r (streaming)", query)
            await memory.append_turn(session_id, query, cached["answer"])
            yield cached["answer"]
            entity_doc_ids, primary_entity, _ = await _resolve_entity_context(session_id, query, history)
            meta = {
                "cached": True,
                "location": (loc.model_dump() if (loc := _build_location_card(primary_entity, query)) else None),
                "suggested_actions": [a.model_dump() for a in _build_suggested_actions(primary_entity)],
            }
            yield _STREAM_META_MARKER + json.dumps(meta)
            return

    entity_doc_ids, primary_entity, retrieval_query = await _resolve_entity_context(
        session_id, query, history
    )

    # ---------------------------------------------------------
    # Crowd information
    # Always fetch fresh crowd data.
    # Do not use the normal RAG/cache path.
    # ---------------------------------------------------------
    if wants_crowd_info(query):
        if not primary_entity:
            levels = await _get_all_crowd_levels()
            answer = _build_crowd_comparison_answer(levels)

        else:
            crowd = await _get_crowd_level(primary_entity)

            if not crowd:
                answer = (
                    f"I don't have current crowd information for "
                    f"{primary_entity['name_en']}."
                )
            else:
                label = crowd.get("label")

                if label and label != "No data yet":
                    answer = (
                        f"{primary_entity['name_en']} is currently reporting "
                        f"{label} crowd levels based on recent visitor reports."
                    )
                else:
                    answer = (
                        f"I don't have current crowd information for "
                        f"{primary_entity['name_en']}."
                    )

        await memory.append_turn(session_id, query, answer)

        location = _build_location_card(primary_entity, query)
        suggested_actions = _build_suggested_actions(primary_entity)

        yield answer

        yield _STREAM_META_MARKER + json.dumps(
            {
                "cached": False,
                "location": location.model_dump() if location else None,
                "suggested_actions": [
                    a.model_dump() for a in suggested_actions
                ],
            }
        )

        return

    if detected_lang in ("mr", "hi"):
        retrieval_query = await translate_to_english(retrieval_query)

    retriever = get_retriever()
    hits = await run_in_threadpool(
        retriever.retrieve, retrieval_query, top_k=None, entity_doc_ids=entity_doc_ids
    )
    logger.info("retrieved %d chunks for query=%r (streaming)", len(hits), query)

    location = _build_location_card(primary_entity, query)
    suggested_actions = _build_suggested_actions(primary_entity)
    meta = {
        "cached": False,
        "location": location.model_dump() if location else None,
        "suggested_actions": [a.model_dump() for a in suggested_actions],
    }

    if not hits:
        answer = (
            _FALLBACK_KNOWN_ENTITY.format(name=primary_entity["name_en"])
            if primary_entity
            else _FALLBACK_UNKNOWN
        )
        await memory.append_turn(session_id, query, answer)
        yield answer
        yield _STREAM_META_MARKER + json.dumps(meta)
        return

    messages = build_prompt(query, hits, history)

    full_answer_parts: list[str] = []
    async for token in stream_llm(messages):
        full_answer_parts.append(token)
        yield token

    full_answer = "".join(full_answer_parts)
    await memory.append_turn(session_id, query, full_answer)

    if not history and (entity_doc_ids is None or len(entity_doc_ids) == 1):
        await set_cached_response(
            query,
            {
                "answer": full_answer,
                "sources": [],
                "detected_language": detected_lang,
            },
        )

    yield _STREAM_META_MARKER + json.dumps(meta)