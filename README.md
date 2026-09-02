# MandapMaps

Find Ganpati pandals in Pune, plan your darshan route, and ask the assistant about timings and history.

## What's inside

- `frontend/` - React app (Vite)
- `backend/` - Node/Express API
- `chatbot/` - Python RAG assistant (FAISS + Groq)
- `data/` - pandal dataset (private, not committed)

## Prerequisites

- Node >= 20
- Python >= 3.11
- Docker

## Running locally

The app runs as three processes. Open three terminal tabs.

### 0. Start infrastructure

```bash
docker compose up -d
```

### 1. Backend (Terminal 1)

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Runs on `http://localhost:4000`. Run `migrate` and `seed` only once (or when the schema/data changes).

### 2. Chatbot (Terminal 2)

```bash
cd chatbot
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set GROQ_API_KEY in .env (get one at console.groq.com)
python ingest_seed_data.py
uvicorn app.main:app --reload --port 8000
```

Runs on `http://localhost:8000`. On subsequent runs, just activate the venv and run `uvicorn`. Re-run `ingest_seed_data.py` only if the dataset changes.

### 3. Frontend (Terminal 3)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite dev server proxies `/api` to the backend and `/api/chat` to the chatbot.

## Data

`seed-data.json` is private and not committed. Use `seed-data.example.json` to test the chatbot pipeline without the real dataset.
