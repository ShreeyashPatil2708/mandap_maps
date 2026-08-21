"""Simple query-response cache to avoid re-hitting the LLM for repeated
common questions (e.g. "aarti timings today") across many users."""
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


def get_cached_response(query: str) -> dict | None:
    client = redis_client()
    if client is None:
        return None
    try:
        raw = client.get(_cache_key(query))
        return json.loads(raw) if raw else None
    except Exception:
        logger.warning("cache read failed; skipping cache", exc_info=True)
        return None


def set_cached_response(query: str, payload: dict):
    client = redis_client()
    if client is None:
        return
    try:
        client.set(_cache_key(query), json.dumps(payload), ex=settings.CACHE_TTL_SECONDS)
    except Exception:
        logger.warning("cache write failed; skipping cache", exc_info=True)
