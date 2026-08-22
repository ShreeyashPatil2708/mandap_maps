# chatbot_v2 — accuracy fixes on top of chatbot_fast

This folder = `chatbot_fast` (the earlier speed pass) + accuracy fixes for the
issues found in the real chatbot transcripts you shared: inconsistent
answers, cross-entity mixing, broken follow-up handling, hallucinated
facts, and weak Marathi/Hindi retrieval.

## What changed and why

### 1. New: `app/core/entity_resolver.py`
Builds a canonical list of mandal names (English + Marathi) from your
dataset and matches them against the user's query:
- **Exact match first** — this is what correctly tells "Kasba Ganpati"
  apart from "Kasba Peth Talim Ganpati" (issue #7), since the shorter
  name isn't a substring of a query using the longer one, and vice versa.
- **Fuzzy match as fallback** (rapidfuzz, sliding-window) — catches typos
  and spelling variants like "Kasaba Ganpati" / "Kasba Ganapati" (issue
  #11) without confusing entities that just share a common word like
  "Ganpati".
- `is_broad_query()` flags deliberately cross-mandal questions ("which
  mandal has...", "compare X and Y") so those are *not* narrowed to a
  single mandal.

### 2. `app/core/vector_store.py` + `app/core/hybrid_retriever.py`
`retrieve()` now takes an optional `entity_doc_ids` filter. When a mandal
is resolved (directly or via follow-up), retrieval is **hard-restricted**
to that mandal's chunks before scoring — not just nudged toward them.
This is the direct fix for cross-entity contamination (issue #2: a
"what happened to the idol" question about Kasba Ganpati pulling in
Tambat Ali's answer instead) and for entity-mixing in general (issues
#5, #6, #14).

### 3. `app/core/memory.py`
Sessions now track a `last_entity` (the most recently resolved mandal),
alongside the existing conversation history.

### 4. `app/core/rag_pipeline.py`
New `_resolve_entity_context()` runs before retrieval on every turn:
- If the query names a mandal → use it (and remember it for next turn).
- If not, and the query **isn't** a broad/comparison question → reuse the
  last mandal from session memory. This is deliberately more aggressive
  than pronoun-spotting: it's what correctly resolves "What happened to
  the idol over the centuries?" (no pronoun at all, but clearly a
  follow-up) back to the mandal from two turns earlier (issues #3, #4, #12,
  #13).
- If no context can be resolved and retrieval finds nothing, a
  **deterministic, non-LLM fallback message** is returned instead of
  asking the model to improvise (issues #15, #16) — it can't hallucinate a
  wrong mandal or invent an unrelated suggestion because the LLM is never
  called for that response.
- Cross-lingual queries (Marathi/Hindi) are translated to English via a
  small Groq call **before** embedding, since the dataset is in English
  and the multilingual embedder retrieves noticeably worse on Devanagari
  queries than their English equivalent (issue #9, #10). The LLM still
  answers in the original language — only the retrieval query is
  translated, not the final prompt.

### 5. `app/core/llm.py`
- System prompt tightened: explicit rule against inventing rankings,
  positions, dates, or recommendations not present in CONTEXT (issue #6,
  #8, #14), and against blending facts from a different mandal even if it
  appears in the same CONTEXT batch (issue #17 comparison contamination).
- The old "suggest an unrelated example question" fallback instruction is
  removed — that's now handled by the deterministic fallback above instead.
- Temperature lowered from 0.3 → 0.15 for tighter grounding to the
  provided context.

### 6. `requirements.txt`
Added `rapidfuzz==3.9.6` for the entity resolver's typo tolerance.

## What this does *not* fully solve
- **"Not found" vs "not available" (issue #16)**: improved but not
  perfect — when an entity is resolved and retrieval still comes back
  empty, the fallback message is now honest about what's known
  ("I have information about X, but not on that specific question") but
  it can't tell you *why* retrieval failed if it's a genuine, subtle
  ranking issue rather than the entity/language problems fixed here.
- **Deep multi-hop reasoning** (issue #13, e.g. "arrival time + nearest
  metro" in one question): entity filtering makes sure both pieces of
  info are in the retrieved context if they exist for that mandal, but
  whether the LLM combines both in one answer still depends on `TOP_K`
  (currently 5) being large enough to include both chunks. If you see
  this still failing, try raising `TOP_K` in `.env`.

## How to run it

```bash
cd chatbot_v2

# 1. Create and activate a virtualenv (recommended)
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies (now includes rapidfuzz)
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# then edit .env and set GROQ_API_KEY (get one free at https://console.groq.com/keys)

# 4. Drop your real dataset in place (if you have it)
#    chatbot_v2/seed-data.json  — same file the original chatbot used.
#    Without it, seed-data.example.json (placeholder data) is used instead.

# 5. Make sure Redis is running (needed for session memory / cache / last-entity)
#    e.g. via Docker:
docker run -d -p 6379:6379 redis:7

# 6. Build the FAISS index from your dataset
python ingest_seed_data.py

# 7. Start the server
uvicorn app.main:app --reload --port 8000
```

Then test it, e.g.:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test1", "query": "What is the morning aarti timing of Kasba Ganpati?"}'

# follow-up, same session_id, no mandal named:
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test1", "query": "What happened to the idol over the centuries?"}'
```

The second call should now stay grounded to Kasba Ganpati — you can check
`sources[].source` in the response to confirm every retrieved chunk comes
from the same mandal.

## Suggested next step: re-run your transcript test set
Since you already have the set of real questions that exposed these bugs,
the fastest way to verify the fix is to replay the same questions (same
`session_id` per conversation, in order) against `chatbot_v2` and diff the
answers against your original findings — especially the Kasba Ganpati
aarti-timing consistency check (issue #1) and the Marathi timing queries
(issue #9).
