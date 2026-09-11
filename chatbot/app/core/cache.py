"""Simple query-response cache to avoid re-hitting the LLM for repeated
common questions (e.g. "aarti timings today") across many users.

Now awaits the async Redis client (see memory.py) instead of making a
blocking sync call inside the async request path.
"""
import hashlib
import json
import logging

from app.config import get_settings
from app.core.memory import redis_client

logger = logging.getLogger("ekdanta.cache")
settings = get_settings()


def _cache_key(query: str) -> str:
    normalized = query.strip().lower()
    digest = hashlib.sha256(normalized.encode()).hexdigest()
    return f"ekdanta:cache:{digest}"


async def get_cached_response(query: str) -> dict | None:
    client = redis_client()
    if client is None:
        return None
    try:
        raw = await client.get(_cache_key(query))
        return json.loads(raw) if raw else None
    except Exception:
        logger.warning("cache read failed; skipping cache", exc_info=True)
        return None


async def set_cached_response(query: str, payload: dict):
    client = redis_client()
    if client is None:
        return
    try:
        await client.set(_cache_key(query), json.dumps(payload), ex=settings.CACHE_TTL_SECONDS)
    except Exception:
        logger.warning("cache write failed; skipping cache", exc_info=True)
