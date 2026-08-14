"""
Lightweight auth for write endpoints.

/api/ingest mutates the shared knowledge base, so it must not be open to the
public internet (an attacker could poison every future RAG answer). We gate it
behind a shared secret sent in the `X-API-Key` header, compared in constant time.

If INGEST_API_KEY is left empty (local dev default), the check is skipped so the
demo still runs out of the box. Set INGEST_API_KEY in .env for any real deployment.
"""
import hmac

from fastapi import Header, HTTPException, status

from app.config import get_settings

settings = get_settings()


def require_ingest_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = settings.INGEST_API_KEY
    if not expected:
        # No key configured -> open (intended only for local development).
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
