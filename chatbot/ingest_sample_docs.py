"""
Run this once (after installing requirements) to build the FAISS index
from the sample festival documents in app/data/sample_docs/.

Usage:
    cd backend
    python ingest_sample_docs.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.core.vector_store import get_vector_store

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "app", "data", "sample_docs")


def main():
    store = get_vector_store()
    total_chunks = 0
    for filename in sorted(os.listdir(SAMPLE_DIR)):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(SAMPLE_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            doc = json.load(f)
        n = store.add_document(doc["doc_id"], doc["title"], doc["text"], doc["category"])
        total_chunks += n
        print(f"Ingested '{doc['title']}' -> {n} chunks")

    print(f"\nDone. Total chunks in index: {total_chunks}")


if __name__ == "__main__":
    main()
