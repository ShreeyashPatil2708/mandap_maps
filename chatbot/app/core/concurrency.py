"""
Global concurrency gate for the chat pipeline.

The chatbot runs single-worker uvicorn on one small (2 GB) Spot instance. Each
query runs the embedding model + FAISS in a worker thread, so a burst of
distinct users (which per-IP rate limiting does not bound) could run many heavy
inferences at once and OOM the box. A process-global semaphore caps how many
pipelines run concurrently; callers that cannot get a slot within a short wait
get BusyError, which the API layer turns into a friendly 503.
"""
import asyncio

from app.config import get_settings

settings = get_settings()

# Process-global: authoritative because the service runs a single worker.
_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_CHATS)


class BusyError(Exception):
    """Raised when no concurrency slot is free within BUSY_WAIT_SECONDS."""


async def acquire_slot() -> None:
    """Take a concurrency slot, waiting up to BUSY_WAIT_SECONDS.

    Raises BusyError if none frees up in time so the caller can shed load
    instead of piling onto a saturated box. Every successful call must be
    paired with release_slot(), including when the work fails or is cancelled.
    """
    try:
        await asyncio.wait_for(_semaphore.acquire(), timeout=settings.BUSY_WAIT_SECONDS)
    except asyncio.TimeoutError as exc:
        raise BusyError from exc


def release_slot() -> None:
    _semaphore.release()
