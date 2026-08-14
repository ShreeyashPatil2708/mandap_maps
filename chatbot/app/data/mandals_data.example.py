"""
EXAMPLE / placeholder mandal data (safe to commit).

The real dataset (`mandals_data.py`) is PRIVATE and gitignored: it is the same
curated dataset the website uses, shared with collaborators by hand, never
committed to this public repo. This file documents the expected shape and lets
the service import + run with dummy data so a fresh clone doesn't crash.

To use real data locally:
  1. Get the private `mandals_data.py` from a collaborator (or `cp` this file to it
     and fill in real records).
  2. Regenerate the RAG docs + index:
       cd chatbot
       python generate_mandal_docs.py    # mandals_data.py -> app/data/sample_docs/
       python ingest_sample_docs.py       # sample_docs/ -> app/data/faiss_index/
"""

MANDALS = [
    dict(
        doc_id="example_ganpati",
        name_en="Example Ganpati",
        name_mr="उदाहरण गणपती",
        manacha="",                       # e.g. "1 (Pehila Manacha)" for a Manache Ganpati, else ""
        area="Example Peth, Pune",
        year="1900",
        category="sarvajanik_mandal",     # manache_ganpati | famous_temple | heritage | sarvajanik_mandal
        history="Short history of the mandal goes here.",
        idol="Description of the idol / pandal setting.",
        address="Full street address, Pune 411000",
        pandal_address="TO UPDATE (announced closer to the festival)",
        maps_link="https://maps.google.com/?q=18.5,73.85",
        lat=18.5000,
        lng=73.8500,
        morning_aarti="Mangala Aarti: 6:00 AM",
        evening_aarti="Sayan Aarti: 9:00 PM",
        events="Notable events during the 10 days.",
        notes="Any field marked TO UPDATE/TO CONFIRM is surfaced to users as unconfirmed.",
    ),
]
