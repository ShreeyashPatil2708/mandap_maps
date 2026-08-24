"""
Conversation memory per session_id, stored in Redis (so it survives
process restarts / scales across multiple backend workers). Falls back
to an in-process dict if Redis is unreachable, so local dev without
Redis still works.

Uses redis.asyncio so calls are awaited instead of blocking the event
loop: with the old sync redis-py client, every get/set here froze the
whole FastAPI event loop for the round-trip, which meant concurrent
users' requests queued up behind each other even before the LLM call.

Redis calls are wrapped so that an outage *after* startup degrades to the
in-memory store for that call instead of raising 500s on every request.
"""
import json
import logging

import redis.asyncio as redis

from app.config import get_settings

logger = logging.getLogger("ekdanta.memory")
settings = get_settings()

_fallback_store: dict[str, list[dict]] = {}

_redis_client: "redis.Redis | None" = None
REDIS_AVAILABLE = False


async def init_redis():
    """Call once on app startup. Pings Redis to decide whether to use it
    for the rest of the process lifetime (matches old sync behavior)."""
    global _redis_client, REDIS_AVAILABLE
    try:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await _redis_client.ping()
        REDIS_AVAILABLE = True
    except Exception:  # noqa: BLE001
        REDIS_AVAILABLE = False
        _redis_client = None


def redis_client():
    """Return a live async Redis client, or None if Redis is unavailable."""
    return _redis_client if REDIS_AVAILABLE else None


def _key(session_id: str) -> str:
    return f"ekdanta:memory:{session_id}"


def _entity_key(session_id: str) -> str:
    return f"ekdanta:entity:{session_id}"


_fallback_entity_store: dict[str, dict] = {}


async def get_last_entity(session_id: str) -> dict | None:
    """The mandal (doc_id + name_en) resolved in this session's most
    recent turn, used to resolve follow-up questions that don't name a
    mandal (see entity_resolver.is_broad_query / rag_pipeline.py)."""
    if REDIS_AVAILABLE:
        try:
            raw = await _redis_client.get(_entity_key(session_id))
            return json.loads(raw) if raw else None
        except Exception:
            logger.warning("redis get failed; falling back to in-memory store", exc_info=True)
    return _fallback_entity_store.get(session_id)


async def set_last_entity(session_id: str, doc_id: str, name_en: str):
    payload = {"doc_id": doc_id, "name_en": name_en}
    if REDIS_AVAILABLE:
        try:
            await _redis_client.set(_entity_key(session_id), json.dumps(payload), ex=settings.CACHE_TTL_SECONDS)
            return
        except Exception:
            logger.warning("redis set failed; falling back to in-memory store", exc_info=True)
    _fallback_entity_store[session_id] = payload


async def get_history(session_id: str) -> list[dict]:
    if REDIS_AVAILABLE:
        try:
            raw = await _redis_client.get(_key(session_id))
            return json.loads(raw) if raw else []
        except Exception:
            logger.warning("redis get failed; falling back to in-memory store", exc_info=True)
    return _fallback_store.get(session_id, [])


async def append_turn(session_id: str, user_msg: str, assistant_msg: str):
    history = await get_history(session_id)
    history.append({"user": user_msg, "assistant": assistant_msg})
    history = history[-settings.MEMORY_TURNS:]

    if REDIS_AVAILABLE:
        try:
            await _redis_client.set(_key(session_id), json.dumps(history), ex=settings.CACHE_TTL_SECONDS)
            return
        except Exception:
            logger.warning("redis set failed; falling back to in-memory store", exc_info=True)
    _fallback_store[session_id] = history


async def clear_history(session_id: str):
    if REDIS_AVAILABLE:
        try:
            await _redis_client.delete(_key(session_id))
            await _redis_client.delete(_entity_key(session_id))
            return
        except Exception:
            logger.warning("redis delete failed; falling back to in-memory store", exc_info=True)
    _fallback_store.pop(session_id, None)
    _fallback_entity_store.pop(session_id, None)
