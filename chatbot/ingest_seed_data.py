"""
Ingest app data from seed-data.json (rich mandal records) into the FAISS
vector store, replacing the old sample_docs ingestion.

Usage:
    cd backend
    python ingest_seed_data.py                     # uses ./seed-data.json
    python ingest_seed_data.py /path/to/seed-data.json
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.core.vector_store import get_vector_store

DEFAULT_PATH = os.path.join(os.path.dirname(__file__), "seed-data.json")


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug


def record_to_text(rec: dict) -> str:
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
    if rec.get("history_marathi"):
        add("Marathi history", rec["history_marathi"])
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
        metro_str = "; ".join(
            f"{m.get('name')} ({m.get('line')}, {m.get('dist')})" for m in rec["metro"]
        )
        add("Nearest metro", metro_str)
    if rec.get("food"):
        food_str = "; ".join(
            f"{f.get('name')} - {f.get('type')} ({f.get('dist')})" for f in rec["food"]
        )
        add("Nearby food", food_str)
    add("Google Maps", rec.get("google_maps_url"))

    return "\n".join(parts)


def main(path: str):
    with open(path, "r", encoding="utf-8") as f:
        records = json.load(f)

    store = get_vector_store()
    total_chunks = 0
    for rec in records:
        name = rec.get("name_english", "unknown")
        doc_id = slugify(name)
        title = name
        category = rec.get("category", "Ganpati Mandal")
        text = record_to_text(rec)

        n = store.add_document(doc_id, title, text, category)
        total_chunks += n
        print(f"Ingested '{title}' -> {n} chunks")

    print(f"\nDone. {len(records)} mandals ingested, {total_chunks} total chunks in index.")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    main(path)
