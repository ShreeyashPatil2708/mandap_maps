"""
Lightweight auth for write endpoints.

/api/ingest mutates the shared knowledge base, so it must not be open to the
public internet (an attacker could poison every future RAG answer). We gate it
behind a shared secret sent in the `X-API-Key` header, compared in constant time.

If INGEST_API_KEY is left empty, the check is skipped in local development so
the demo still runs out of the box, but in production (ENV=production) an empty
key fails closed: the endpoint refuses every request rather than falling open.
"""
import hmac

from fastapi import Header, HTTPException, status

from app.config import get_settings

settings = get_settings()


def require_ingest_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = settings.INGEST_API_KEY
    if not expected:
        if settings.is_production:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ingestion is disabled.",
            )
        # No key configured in local development -> open.
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
