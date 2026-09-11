"""
Build the FAISS index from the mandal dataset (seed-data.json, or the
seed-data.example.json fallback). Reads through app.data.loader so it uses
the exact same data and text mapping as the /api/mandals endpoint.

Usage:
    cd chatbot
    python ingest_seed_data.py                 # uses seed-data.json (or the example)
    python ingest_seed_data.py path/to/seed-data.json

Always rebuilds from scratch: any existing index is deleted first, since the
store only appends and re-running would otherwise duplicate every chunk.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.config import get_settings
from app.core.vector_store import get_vector_store
from app.data.loader import get_general_knowledge, load_records, slugify, to_text


def _reset_index():
    settings = get_settings()
    for p in (settings.FAISS_INDEX_PATH, settings.FAISS_METADATA_PATH):
        if os.path.exists(p):
            os.remove(p)


def main(path: str | None = None):
    if path:
        with open(path, "r", encoding="utf-8") as f:
            records = json.load(f)
    else:
        records = load_records()

    _reset_index()
    store = get_vector_store()
    total_chunks = 0
    for rec in records:
        name = rec.get("name_english", "unknown")
        n = store.add_document(slugify(name), name, to_text(rec), rec.get("category", "Ganpati Mandal"))
        total_chunks += n
        print(f"Ingested '{name}' -> {n} chunks")

    for doc in get_general_knowledge():
        n = store.add_document(doc["id"], doc["title"], doc["text"], "General Knowledge")
        total_chunks += n
        print(f"Ingested general fact '{doc['title']}' -> {n} chunks")

    print(f"\nDone. {len(records)} mandals + {len(get_general_knowledge())} general facts ingested, {total_chunks} total chunks in index.")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
