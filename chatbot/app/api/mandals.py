"""
Structured mandal data API, separate from the RAG chat endpoint.
The chatbot (/api/chat) is for natural-language Q&A; this is for the
frontend's map pins, list views, and filters, where you want raw
fields (lat/lng, addresses, tags) rather than an LLM-generated answer.
"""
import math
from fastapi import APIRouter, HTTPException, Query, Request

from app.config import get_settings
from app.core.limiter import limiter
from app.data.mandals_data import MANDALS

settings = get_settings()

router = APIRouter(prefix="/api/mandals", tags=["mandals"])


def _public_fields(m: dict) -> dict:
    """Shape a mandal record for API responses (drop internal-only keys if any)."""
    return {
        "doc_id": m["doc_id"],
        "name_en": m["name_en"],
        "name_mr": m["name_mr"],
        "manacha": m["manacha"],
        "area": m["area"],
        "year": m["year"],
        "category": m["category"],
        "why_significant": m["idol"],
        "address": m["address"],
        "pandal_address": m["pandal_address"],
        "maps_link": m["maps_link"],
        "lat": m["lat"],
        "lng": m["lng"],
        "morning_aarti": m["morning_aarti"],
        "evening_aarti": m["evening_aarti"],
        "events": m["events"],
        "notes": m["notes"],
    }


def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0  # Earth radius in km
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


@router.get("")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def list_mandals(request: Request, category: str | None = Query(None, description="Filter by category, e.g. manache_ganpati, heritage, sarvajanik_mandal, famous_temple")):
    mandals = MANDALS
    if category:
        mandals = [m for m in mandals if m["category"] == category]
    return {"count": len(mandals), "mandals": [_public_fields(m) for m in mandals]}


@router.get("/categories")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def list_categories(request: Request):
    cats = {}
    for m in MANDALS:
        cats[m["category"]] = cats.get(m["category"], 0) + 1
    return cats


@router.get("/nearby")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def nearby_mandals(
    request: Request,
    lat: float = Query(..., ge=-90, le=90, description="User's current latitude"),
    lng: float = Query(..., ge=-180, le=180, description="User's current longitude"),
    limit: int = Query(5, ge=1, le=19),
):
    ranked = sorted(
        MANDALS,
        key=lambda m: _haversine_km(lat, lng, m["lat"], m["lng"]),
    )[:limit]
    return {
        "origin": {"lat": lat, "lng": lng},
        "mandals": [
            {**_public_fields(m), "distance_km": round(_haversine_km(lat, lng, m["lat"], m["lng"]), 2)}
            for m in ranked
        ],
    }


@router.get("/{doc_id}")
@limiter.limit(settings.MANDALS_RATE_LIMIT)
async def get_mandal(request: Request, doc_id: str):
    for m in MANDALS:
        if m["doc_id"] == doc_id:
            return _public_fields(m)
    raise HTTPException(status_code=404, detail=f"No mandal found with doc_id '{doc_id}'")
