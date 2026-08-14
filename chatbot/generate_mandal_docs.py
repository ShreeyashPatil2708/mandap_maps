"""
Converts the shared mandal dataset (app/data/mandals_data.py) into
per-mandal JSON documents for RAG ingestion, saved into
app/data/sample_docs/. Run this once, then run ingest_sample_docs.py
to build the FAISS index.

Usage:
    cd backend
    python generate_mandal_docs.py
    python ingest_sample_docs.py

The structured version of this same data is served live via
GET /api/mandals for map/list UI use — see app/api/mandals.py.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.data.mandals_data import MANDALS

OUT_DIR = os.path.join(os.path.dirname(__file__), "app", "data", "sample_docs")
os.makedirs(OUT_DIR, exist_ok=True)


def build_text(m: dict) -> str:
    return (
        f"{m['name_en']} ({m['name_mr']}) — {m['manacha']}, located in {m['area']}, "
        f"established {m['year']}.\n\n"
        f"History: {m['history']}\n\n"
        f"Idol/Deity: {m['idol']}\n\n"
        f"Temple/Mandir address: {m['address']}. "
        f"Festival pandal address: {m['pandal_address']}. Maps link: {m['maps_link']}. "
        f"Coordinates: {m['lat']}, {m['lng']}.\n\n"
        f"Aarti timings — Morning: {m['morning_aarti']}; Evening: {m['evening_aarti']}.\n\n"
        f"Special events during the 10 days: {m['events']}.\n\n"
        f"Note: {m['notes']}"
    )


def main():
    for m in MANDALS:
        doc = {
            "doc_id": m["doc_id"],
            "title": m["name_en"],
            "category": m["category"],
            "text": build_text(m),
        }
        path = os.path.join(OUT_DIR, f"{m['doc_id']}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
        print(f"Wrote {path}")

    print(f"\nGenerated {len(MANDALS)} mandal documents in {OUT_DIR}")


if __name__ == "__main__":
    main()
