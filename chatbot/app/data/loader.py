"""
Single source of truth for the chatbot's mandal dataset.

Loads the private `seed-data.json` (the SAME file the website seeds Postgres from,
shared with collaborators by hand and gitignored). If it is absent, falls back to
the committed `seed-data.example.json` so a fresh clone still runs with placeholder
data instead of crashing.

Both the structured `/api/mandals` endpoint and the RAG ingester read through here,
so there is exactly one dataset and one field mapping across the whole service.
"""
import json
import logging
import os
import re
from functools import lru_cache

logger = logging.getLogger("ekdanta.data")

# .../chatbot/ (this file is at chatbot/app/data/loader.py)
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATA_PATH = os.path.join(_ROOT, "seed-data.json")
EXAMPLE_PATH = os.path.join(_ROOT, "seed-data.example.json")


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")


def _num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _resolve_path() -> str:
    if os.path.exists(DATA_PATH):
        return DATA_PATH
    if os.path.exists(EXAMPLE_PATH):
        logger.warning(
            "seed-data.json not found; using seed-data.example.json (placeholder data). "
            "Drop the real seed-data.json into chatbot/ for the full dataset."
        )
        return EXAMPLE_PATH
    raise FileNotFoundError(
        "No dataset found. Expected seed-data.json (private) or seed-data.example.json "
        f"in {_ROOT}."
    )


@lru_cache
def load_records() -> list[dict]:
    """Raw seed-data records (rich schema), as the website stores them."""
    with open(_resolve_path(), "r", encoding="utf-8") as f:
        return json.load(f)


def to_text(rec: dict) -> str:
    """Flatten one mandal record into a single text blob for chunking/embedding."""
    parts = []

    def add(label, value):
        if value:
            parts.append(f"{label}: {value}")

    add("Name", f"{rec.get('name_english')} ({rec.get('name_marathi')})")
    add("Area", rec.get("area"))
    add("Manacha number", rec.get("manacha_number"))
    add("Category", rec.get("category"))
    add("Established", rec.get("year_established"))
    add("History", rec.get("history_english"))
    add("Marathi history", rec.get("history_marathi"))
    add("Significance", rec.get("significance_short"))
    add("Idol description", rec.get("idol_description"))
    add("Mandir address", rec.get("mandir_address"))
    add("Pandal address", rec.get("pandal_address"))
    add("Morning aarti", rec.get("morning_aarti"))
    add("Evening aarti", rec.get("evening_aarti"))
    add("Special events", rec.get("special_events"))
    if rec.get("tags"):
        add("Tags", ", ".join(rec["tags"]))
    if rec.get("did_you_know"):
        add("Did you know", rec["did_you_know"])
    if rec.get("metro"):
        add("Nearest metro", "; ".join(
            f"{m.get('name')} ({m.get('line')}, {m.get('dist')})" for m in rec["metro"]
        ))
    if rec.get("food"):
        add("Nearby food", "; ".join(
            f"{f.get('name')} - {f.get('type')} ({f.get('dist')})" for f in rec["food"]
        ))
    add("Google Maps", rec.get("google_maps_url"))
    return "\n".join(parts)


def _to_public(rec: dict) -> dict:
    """Map a raw seed-data record to the shape /api/mandals returns."""
    name = rec.get("name_english") or "unknown"
    return {
        "doc_id": slugify(name),
        "name_en": name,
        "name_mr": rec.get("name_marathi"),
        "manacha": rec.get("manacha_number"),
        "is_manacha": rec.get("is_manacha"),
        "area": rec.get("area"),
        "year": rec.get("year_established"),
        "category": rec.get("category"),
        "why_significant": rec.get("significance_short") or rec.get("idol_description"),
        "idol_description": rec.get("idol_description"),
        "address": rec.get("mandir_address"),
        "pandal_address": rec.get("pandal_address"),
        "maps_link": rec.get("google_maps_url"),
        "photo_url": rec.get("photo_url") or None,
        "lat": _num(rec.get("latitude")),
        "lng": _num(rec.get("longitude")),
        "morning_aarti": rec.get("morning_aarti"),
        "evening_aarti": rec.get("evening_aarti"),
        "events": rec.get("special_events"),
        "tags": rec.get("tags") or [],
        "did_you_know": rec.get("did_you_know"),
        "food": rec.get("food") or [],
    }


@lru_cache
def get_mandals() -> list[dict]:
    """Structured mandal records for the /api/mandals endpoint."""
    return [_to_public(r) for r in load_records()]

######

GENERAL_PATH = os.path.join(_ROOT, "general-knowledge.json")


@lru_cache
def get_general_knowledge() -> list[dict]:
    """Non-mandal-specific festival/Ganpati facts (see general-knowledge.json).
    Kept separate from seed-data.json so it never pollutes /api/mandals, the
    map UI, or entity resolution — these docs have no doc_id in get_mandals()."""
    if not os.path.exists(GENERAL_PATH):
        return []
    with open(GENERAL_PATH, "r", encoding="utf-8") as f:
        general = json.load(f)

    # Auto-generate the "5 Manache Ganpati" list from real mandal data instead
    # of hand-typing it, so it can never drift out of sync with seed-data.json.
    manache = sorted(
        (m for m in get_mandals() if m.get("is_manacha")),
        key=lambda m: m.get("manacha", 99),
    )
    if manache:
        listing = "; ".join(f"{m['manacha']}. {m['name_en']} ({m['area']})" for m in manache)
        general.append({
            "id": "manache-ganpati-list",
            "title": "The 5 Manache Ganpati of Pune",
            "text": f"The Manache Ganpati are Pune's five most ceremonially significant mandals, ranked in this order: {listing}.",
        })
    return general