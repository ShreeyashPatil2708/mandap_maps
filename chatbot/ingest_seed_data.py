"""
Build the FAISS index from the mandal dataset (seed-data.json, or the
seed-data.example.json fallback). Reads through app.data.loader so it uses
the exact same data and text mapping as the /api/mandals endpoint.

Usage:
    cd chatbot
    python ingest_seed_data.py                 # uses seed-data.json (or the example)
    python ingest_seed_data.py path/to/seed-data.json
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.core.vector_store import get_vector_store
from app.data.loader import load_records, slugify, to_text


def main(path: str | None = None):
    if path:
        with open(path, "r", encoding="utf-8") as f:
            records = json.load(f)
    else:
        records = load_records()

    store = get_vector_store()
    total_chunks = 0
    for rec in records:
        name = rec.get("name_english", "unknown")
        n = store.add_document(slugify(name), name, to_text(rec), rec.get("category", "Ganpati Mandal"))
        total_chunks += n
        print(f"Ingested '{name}' -> {n} chunks")

    print(f"\nDone. {len(records)} mandals ingested, {total_chunks} total chunks in index.")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
