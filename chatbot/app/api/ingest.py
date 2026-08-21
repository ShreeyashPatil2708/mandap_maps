import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import get_settings
from app.core.limiter import limiter
from app.core.security import require_ingest_key
from app.core.vector_store import get_vector_store
from app.models.schemas import IngestDocument, IngestResponse

logger = logging.getLogger("ekdanta.api")
settings = get_settings()

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("", response_model=IngestResponse, dependencies=[Depends(require_ingest_key)])
@limiter.limit(settings.INGEST_RATE_LIMIT)
async def ingest_document(request: Request, doc: IngestDocument):
    try:
        store = get_vector_store()
        n_chunks = store.add_document(doc.doc_id, doc.title, doc.text, doc.category)
        return IngestResponse(ingested_chunks=n_chunks, doc_id=doc.doc_id)
    except Exception:
        logger.exception("ingestion failed for doc_id=%s", doc.doc_id)
        raise HTTPException(status_code=500, detail="Ingestion failed.")


@router.get("/stats")
async def ingest_stats():
    store = get_vector_store()
    chunks = store.all_chunks()
    categories = {}
    for c in chunks:
        categories[c["category"]] = categories.get(c["category"], 0) + 1
    return {"total_chunks": len(chunks), "by_category": categories}
