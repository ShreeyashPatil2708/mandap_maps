"""
Structured mandal data API, separate from the RAG chat endpoint.
The chatbot (/api/chat) is for natural-language Q&A; this is for raw
fields (lat/lng, addresses, tags) rather than an LLM-generated answer.

Reads through app.data.loader, so it shares one dataset (seed-data.json)
and one field mapping with the RAG ingester.
"""
from fastapi import APIRouter, HTTPException, Query, Request

from app.config import get_settings
from app.core.geo import haversine_km as _haversine_km
from app.core.limiter import limiter
from app.data.loader import get_mandals

settings = get_settings()

router = APIRouter(prefix="/api/mandals", tags=["mandals"])


@router.get("")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def list_mandals(request: Request, category: str | None = Query(None, description="Filter by category")):
    mandals = get_mandals()
    if category:
        mandals = [m for m in mandals if m["category"] == category]
    return {"count": len(mandals), "mandals": mandals}


@router.get("/categories")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def list_categories(request: Request):
    cats = {}
    for m in get_mandals():
        cats[m["category"]] = cats.get(m["category"], 0) + 1
    return cats


@router.get("/nearby")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def nearby_mandals(
    request: Request,
    lat: float = Query(..., ge=-90, le=90, description="User's current latitude"),
    lng: float = Query(..., ge=-180, le=180, description="User's current longitude"),
    limit: int = Query(5, ge=1, le=50),
):
    # Only mandals that have usable coordinates can be ranked by distance.
    located = [m for m in get_mandals() if m["lat"] is not None and m["lng"] is not None]
    ranked = sorted(located, key=lambda m: _haversine_km(lat, lng, m["lat"], m["lng"]))[:limit]
    return {
        "origin": {"lat": lat, "lng": lng},
        "mandals": [
            {**m, "distance_km": round(_haversine_km(lat, lng, m["lat"], m["lng"]), 2)}
            for m in ranked
        ],
    }


@router.get("/{doc_id}")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def get_mandal(request: Request, doc_id: str):
    for m in get_mandals():
        if m["doc_id"] == doc_id:
            return m
    raise HTTPException(status_code=404, detail=f"No mandal found with doc_id '{doc_id}'")
