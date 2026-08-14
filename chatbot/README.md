# Ekdanta — Pune Ganeshotsav RAG Chatbot

A production-shaped, hybrid Retrieval-Augmented Generation (RAG) chatbot built as the
AI assistant layer for **Ekdanta**, a mobile-first digital companion for Pune's
Ganeshotsav festival. Answers questions on mandal info, darshan/aarti timings, queues,
parking, transport, emergency services, festival history and FAQs — grounded in your
own festival documents, running fully on a local Ollama LLM.

---

## 1. Why this architecture

| Requirement | Design choice | Reasoning |
|---|---|---|
| Reduce hallucination | Hybrid RAG (FAISS + BM25), strict "answer only from context" system prompt | Dense retrieval alone misses exact proper nouns (mandal names, timings); BM25 alone misses paraphrases/multilingual queries. Combining both raises recall without inflating hallucination risk. |
| Multilingual (EN/MR/HI) | `paraphrase-multilingual-MiniLM-L12-v2` embeddings + language detection + LLM instructed to reply in the user's language | One shared embedding space means a Marathi query still retrieves English-authored source documents (and vice versa) — no need to maintain parallel document sets. |
| Conversational memory / follow-ups | Redis-backed per-session history, replayed into the LLM prompt | Redis survives process restarts and scales across multiple backend workers, unlike an in-process dict. |
| Local LLM, no external API cost | Ollama (`llama3.1:8b` by default, swappable) | Runs entirely on your machine/college server — good for an academic demo with no per-token billing and no data leaving campus. |
| Reduce repeated LLM calls | Redis response cache for stateless, first-turn queries | Common questions ("aarti timings today?") are asked by many devotees; caching cuts latency and Ollama load. Cache is skipped once a session has follow-up history, so context-dependent answers are never served stale. |
| Modular → future AI agent | Clean separation: `embeddings.py` / `vector_store.py` / `hybrid_retriever.py` / `llm.py` / `memory.py` / `rag_pipeline.py` | The pipeline is a single orchestration function (`answer_query`). To evolve into an agent, you'd add a `tools/` package (e.g. live-queue-lookup, route-planner) and let the LLM call them — the retrieval/memory/cache layers underneath don't change. |

### Architecture diagram

```
┌─────────────────────┐        HTTPS/JSON         ┌──────────────────────────┐
│   React Frontend     │ ─────────────────────────▶│        FastAPI            │
│  (Redux Toolkit,      │◀───────────────────────── │   /api/chat  /api/ingest │
│   Tailwind, Router)   │                            └───────────┬──────────────┘
└─────────────────────┘                                        │
                                                                 ▼
                                              ┌──────────────────────────────────┐
                                              │        RAG Pipeline               │
                                              │  (rag_pipeline.answer_query)      │
                                              └───────┬─────────────┬────────────┘
                                                       │             │
                                     ┌─────────────────┘             └───────────────┐
                                     ▼                                                ▼
                     ┌───────────────────────────┐                    ┌───────────────────────────┐
                     │   Hybrid Retriever         │                    │  Conversation Memory /     │
                     │  FAISS (dense) + BM25       │                    │  Response Cache (Redis)    │
                     │  (weighted merge)            │                    └───────────────────────────┘
                     └──────────┬──────────────────┘
                                ▼
                 ┌───────────────────────────────┐         ┌──────────────────────┐
                 │  Sentence-Transformers          │        │   Ollama (local LLM)  │
                 │  multilingual embeddings         │        │   llama3.1:8b (or any) │
                 └───────────────────────────────┘         └──────────────────────┘

                     Postgres: durable chat-log persistence + analytics (optional)
                     Logging: Python `logging` → stdout (pipe to file/ELK/Grafana Loki in prod)
```

---

## 2. Tech stack

**Frontend:** React 18, Redux Toolkit (chat state + async thunks), Tailwind CSS, React
Router (ready for multi-page expansion), Vite.

**Backend:** FastAPI (async, auto-generated OpenAPI docs at `/docs`, native Pydantic
validation — chosen over Spring Boot for faster iteration in a Python-native ML stack
and because your embedding/LLM tooling is all Python-first).

**Database:** PostgreSQL for durable chat history/analytics (optional but included);
Redis for low-latency session memory + response caching.

**Vector DB:** FAISS (`IndexFlatIP` on L2-normalized vectors = cosine similarity) —
free, in-process, no extra server to run, fine for a documents corpus of this size
(hundreds to low-thousands of chunks). Swap for Qdrant/Milvus if the corpus grows to
millions of chunks.

**Embeddings:** `sentence-transformers` multilingual MiniLM (local, free, no API key).
An `OPENAI_API_KEY`-based embedding path can be dropped in by swapping `embeddings.py`
if you'd rather use OpenAI's `text-embedding-3-small`.

**LLM:** Ollama, local, model configurable via `.env` (`OLLAMA_MODEL`).

**Sparse retrieval:** `rank_bm25` — pure Python, no extra service.

---

## 3. Project structure

This chatbot is the Python (FastAPI) AI service inside the MandapMaps website
monorepo. It lives at `chatbot/`, parallel to the Node `backend/` and the React
`frontend/`. There is no separate chatbot frontend: the chat UI is built into the
website's `frontend/` and calls this service over `/api/chat` and `/api/mandals`.

```
website/
├── frontend/                       # React/Vite app (hosts the chat UI)
├── backend/                        # Node/Express API
├── chatbot/                        # <- this Python FastAPI RAG service
│   ├── app/
│   │   ├── main.py                 # FastAPI app + CORS + rate limiter + routers
│   │   ├── config.py               # Settings (env-driven)
│   │   ├── models/schemas.py       # Pydantic request/response models
│   │   ├── core/
│   │   │   ├── embeddings.py       # Multilingual sentence-transformer wrapper
│   │   │   ├── vector_store.py     # FAISS index + chunking + metadata
│   │   │   ├── hybrid_retriever.py # FAISS + BM25 weighted merge
│   │   │   ├── llm.py              # Groq/Ollama client + system prompt + prompt builder
│   │   │   ├── memory.py           # Redis-backed conversation memory (in-memory fallback)
│   │   │   ├── cache.py            # Redis response cache
│   │   │   ├── lang_detect.py      # EN/MR/HI detection
│   │   │   ├── limiter.py          # Per-IP rate limiter (slowapi)
│   │   │   ├── security.py         # X-API-Key auth for /api/ingest
│   │   │   └── rag_pipeline.py     # Orchestrates the above
│   │   ├── api/
│   │   │   ├── chat.py             # POST /api/chat, history, session clear
│   │   │   ├── ingest.py           # POST /api/ingest, /api/ingest/stats
│   │   │   └── mandals.py          # GET /api/mandals, /nearby, /{doc_id} - structured data
│   │   └── data/
│   │       ├── mandals_data.py     # Single source of truth: real mandals from the sheet
│   │       └── sample_docs/        # RAG documents (mandals + general FAQ/transport)
│   ├── db/schema.sql               # Optional Postgres tables
│   ├── generate_mandal_docs.py     # mandals_data.py -> per-mandal RAG JSON docs
│   ├── ingest_sample_docs.py       # One-shot script to build the FAISS index
│   ├── requirements.txt
│   └── .env.example
├── data/  docker-compose.yml  package.json
```

---

## 4. Setup & execution steps

### 4.1 Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed
- Redis (optional but recommended — falls back to in-memory if absent)
- PostgreSQL (optional, only needed if you wire up persistent chat-log storage)

### 4.2 Start Ollama and pull a model
```bash
ollama serve                 # starts the local Ollama server on :11434
ollama pull llama3.1:8b      # or any model you prefer, e.g. mistral, qwen2.5
```
If you use a different model name, set `OLLAMA_MODEL` in `chatbot/.env` to match.

### 4.3 Backend setup
```bash
cd chatbot
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env            # edit if your Ollama model/Redis URL differ

# (optional) start Redis locally, e.g.:
# docker run -d --name ekdanta-redis -p 6379:6379 redis:7

# Build the FAISS index from the sample festival documents:
python ingest_sample_docs.py

# Run the API:
uvicorn app.main:app --reload --port 8000
```
Visit `http://localhost:8000/docs` for interactive Swagger API docs.

### 4.4 Frontend

There is no separate chatbot frontend. The chat UI is part of the website's
`frontend/` (React/Vite) and talks to this service via `frontend/src/services/chatbot.js`
(the `CHATBOT_INTEGRATION_POINT`). Run the website frontend from the repo root as usual
(`npm run dev:frontend`) and point its API base at this service.

### 4.5 (Optional) Postgres for durable chat logs
```bash
createdb ekdanta_db
psql ekdanta_db -f chatbot/db/schema.sql
```
The pipeline currently uses Redis for live memory; wiring `chat_messages` inserts into
`rag_pipeline.answer_query` is a small addition once you're ready to persist logs for
analytics or your research write-up.

### 4.6 Knowledge base contents

> **Private data.** The real dataset is the same curated content the website uses and is
> **not** committed to this public repo. `app/data/mandals_data.py` (the source of truth),
> the generated `app/data/sample_docs/`, `seed-data.json`, and the built `app/data/faiss_index/`
> are all gitignored and shared with collaborators by hand. Only `app/data/mandals_data.example.py`
> (a dummy placeholder documenting the shape) is committed. On a fresh clone, supply the real
> `mandals_data.py` (or `cp mandals_data.example.py mandals_data.py`), then run
> `python generate_mandal_docs.py && python ingest_sample_docs.py` to rebuild the docs + index.

`chatbot/app/data/sample_docs/` ships with **19 real, curated mandal documents**
(generated by `generate_mandal_docs.py` from your "Ganpati 2026" research sheet) —
covering all 5 Manache Ganpatis, famous temples like Dagdusheth Halwai and Sarasbaug,
and 11 heritage/sarvajanik mandals — plus two general reference docs on
transport/parking/emergency services and festival history/FAQs. Each mandal doc
includes history, idol description, address, aarti timings, and notes on which
fields still need yearly confirmation (marked "TO UPDATE"/"TO CONFIRM" — the
chatbot is instructed to say so honestly rather than invent a time or address).

To regenerate everything after editing the sheet data, edit the `MANDALS` list in
`app/data/mandals_data.py` (the single source of truth for both the chatbot's
knowledge and the `/api/mandals` structured endpoint), then re-run:
```bash
python generate_mandal_docs.py   # rebuilds the RAG text docs
python ingest_sample_docs.py     # rebuilds the FAISS index
# no separate step needed for /api/mandals — it reads mandals_data.py live
```

### 4.7 Adding your own real festival documents
POST to `/api/ingest`:
```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "dagdusheth_2026",
    "title": "Shreemant Dagdusheth Halwai Ganpati",
    "text": "Full darshan, timing and history details here...",
    "category": "mandal_info"
  }'
```
Or drop more `.json` files (same shape as the samples) into
`chatbot/app/data/sample_docs/` and re-run `python ingest_sample_docs.py`.

---

## 5. Key API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Main chat endpoint — `{session_id, query, language}` → answer + sources |
| GET | `/api/chat/{session_id}/history` | Inspect stored conversation memory |
| DELETE | `/api/chat/{session_id}` | Clear a session's memory |
| POST | `/api/ingest` | Add a new document to the knowledge base |
| GET | `/api/ingest/stats` | Chunk counts by category |
| GET | `/api/mandals` | Structured mandal list (optional `?category=` filter) — for map pins/list views, not LLM-generated |
| GET | `/api/mandals/categories` | Mandal counts per category |
| GET | `/api/mandals/nearby` | `?lat=&lng=&limit=` — nearest mandals by great-circle distance, using the sheet's lat/long columns |
| GET | `/api/mandals/{doc_id}` | Single mandal's structured record |
| GET | `/health` | Liveness check |

`/api/chat` and `/api/mandals` are deliberately separate: chat is for natural-language
Q&A grounded in retrieval; `/api/mandals` is for the frontend to render map pins, list
views, and a "mandals near me" panel directly from structured fields, without an LLM
round-trip. Both read from the same source of truth — `app/data/mandals_data.py` —
so editing that file and re-running `generate_mandal_docs.py` + `ingest_sample_docs.py`
keeps the chatbot's knowledge and the structured API in sync.

---

## 6. Logging & monitoring notes

- All pipeline stages log via Python's `logging` module (`ekdanta.rag` logger) —
  retrieval hit counts, cache hits, etc. Pipe stdout to a file or a log aggregator
  (Grafana Loki, ELK) in a real deployment.
- For production monitoring, add: request latency histograms (e.g. `prometheus-fastapi-instrumentator`),
  Ollama response-time tracking, and a dashboard on retrieval hit-rate vs. "context not found" rate —
  a useful metric for your evaluation/report since it directly measures hallucination risk.

## 7. Deployment notes (for your report / production hardening)

- **Backend:** containerize with a `Dockerfile` (uvicorn + gunicorn workers), deploy behind
  Nginx/Traefik; Ollama can run as a sidecar container or on a GPU-equipped host.
- **Frontend:** `npm run build` → static files served via Nginx/Vercel/Netlify.
- **Scaling reads:** FAISS index is loaded per-process; for multi-worker deployments,
  either share the index via a mounted volume + periodic reload, or move to a server-based
  vector DB (Qdrant/pgvector) once concurrent write-ingestion becomes frequent.
- **Auth & abuse limits (included):** `/api/ingest` is gated behind a shared secret sent in the
  `X-API-Key` header (set `INGEST_API_KEY` in `.env`; left blank it stays open for local dev only).
  All endpoints are rate-limited per client IP via `slowapi` (`CHAT_RATE_LIMIT`, `INGEST_RATE_LIMIT`,
  `MANDALS_RATE_LIMIT`). Request payloads are size-capped (query ≤ 2000 chars, ingest text ≤ 50000)
  and internal errors are logged server-side rather than returned to clients. For a full user-facing
  auth story, layer JWT auth (e.g. `fastapi-users` or the existing Ekdanta auth service) on top; also
  enforce rate limits at the AWS edge (API Gateway throttling / WAF) in front of the app-level ones.

## 8. Extending to a full AI agent (future work)

The pipeline is intentionally modular so you can graduate from RAG to an agent:
1. Add a `tools/` package: `live_queue_lookup.py`, `route_planner.py`, `notification_sender.py`.
2. Switch `call_ollama` to Ollama's tool-calling API (supported by tool-capable models) or
   implement a simple ReAct loop: let the LLM emit a `{"tool": "...", "args": {...}}` JSON
   block, execute it, feed the result back before the final answer.
3. Keep `hybrid_retriever.py` as the "knowledge" tool and add the above as "action" tools —
   the memory and caching layers require no changes.
