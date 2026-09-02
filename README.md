# MandapMaps

A website for Pune's Ganeshotsav festival. Find Ganpati pandals
near you, plan a darshan route between them, and ask an assistant about timings,
history, and directions.

## What's inside

- `frontend/` - the React app people use on their phone (Vite + React)
- `backend/` - the Node/Express API that serves the Ganpati data
- `chatbot/` - a Python FastAPI RAG assistant (FAISS + BM25 + Groq)
- `data/` - the source dataset (private, shared by hand, not committed)

## Running locally

You need **Node >= 20**, **Python >= 3.11**, and **Docker** installed.

The site runs as three separate processes. Open three terminal tabs.

---

### Step 0 -- infrastructure (Docker)

Start Postgres and Redis. This only needs to be done once per machine restart.

```bash
docker compose up -d
```

---

### Step 1 -- backend API (Terminal 1)

```bash
cd backend
cp .env.example .env        # fill in values if needed; defaults work for local dev
npm install
npm run migrate             # apply schema to Postgres (one-time)
npm run seed                # load pandal data into the DB (one-time, needs seed-data.json)
npm run dev                 # starts on http://localhost:4000
```

---

### Step 2 -- chatbot (Terminal 2)

The chatbot is a Python FastAPI service. The frontend proxies `/api/chat` to it,
so it must be running or the chat widget won't respond.

```bash
cd chatbot

# one-time: create and activate a virtual environment
python -m venv venv
source venv/bin/activate    # on Windows: venv\Scripts\activate

# one-time: install dependencies
pip install -r requirements.txt

# one-time: copy env file and add your Groq API key
cp .env.example .env
# open .env and set GROQ_API_KEY=<your key from console.groq.com>

# one-time: build the FAISS vector index from seed-data.json
python ingest_seed_data.py

# start the chatbot server
uvicorn app.main:app --reload --port 8000
```

The chatbot will be available at `http://localhost:8000`. On subsequent runs you
only need to activate the venv and run the last `uvicorn` command (re-run
`ingest_seed_data.py` only if the dataset changes).

---

### Step 3 -- frontend (Terminal 3)

```bash
cd frontend
cp .env.example .env        # defaults are fine for local dev
npm install
npm run dev                 # starts on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

The Vite dev server proxies:
- `/api/chat` -> chatbot at `http://localhost:8000`
- `/api` -> backend at `http://localhost:4000`

---

## Data

The Ganpati dataset (`seed-data.json`) is private and shared by hand, so it is
not committed to this repo. The chatbot ships a `seed-data.example.json` you can
use to test the pipeline without the real dataset.
