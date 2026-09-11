# MandapMaps

A mobile-first companion for Pune's Ganeshotsav festival. Find Ganpati pandals
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

## Photos

Pandal photos live in the private S3 photos bucket and are served by CloudFront
at `https://mandapmaps.in/photos/...`. To add or replace one:

1. Save it in `data/photos/` (gitignored) named after the pandal's number on the
   site: `mandapmaps.in/?g=6` -> `6.jpg`. For a photo that isn't yours, add a
   credit to `data/photos/credits.json`: `{ "6": "Photo: Name, CC BY-SA 4.0" }`.
2. `npm run photos` resizes it to WebP (metadata stripped), prints an
   id -> pandal table to check, and regenerates `frontend/src/data/photos.js`.
3. `npm run photos -- --upload` syncs the WebP files to the bucket (needs AWS
   credentials for the account).
4. Commit `frontend/src/data/photos.js` and merge to master; CD deploys it.

Pandals without a photo keep the Om placeholder.

---

## Splash and Team pages

The splash screen (`frontend/src/pages/Splash.jsx`) shows once per browser
session: it plays on a fresh visit or new tab, but not on a refresh in the same
tab. Shareable pandal links (`?g=6`) skip it and open the pandal directly. To
see it again while testing, open the site in a private/incognito window or
close and reopen the tab.

"Team MandapMaps" on the splash opens the Team page
(`frontend/src/pages/Team.jsx`); its Back button returns to the splash.

---

## Support Us (UPI)

The UPI QR and id appear on the Home page, the Support popup, and the Team page.

- The UPI id lives in one place: `frontend/src/data/upi.js`. `VITE_UPI_ID`
  overrides it at build time, but CD does not set it, so the value in that file
  is what goes live.
- The QR image is `frontend/public/images/upi-qr.png`. If you change the UPI id,
  replace the QR too so both point at the same account.

---

## Deploying

Merge to `master` and GitHub Actions takes over: CI (lint + build) runs first,
then CD deploys the frontend to S3 + CloudFront and the API and chatbot to their
EC2 instances via SSM. There is no manual step. `index.html` is never cached, so
a new deploy is live as soon as CD finishes.

---

## Writing style

No em-dashes anywhere in the codebase or on the site; use a comma, colon, or a
new sentence. Chatbot answers are covered too: the system prompt
(`chatbot/app/core/llm.py`) tells the model not to use them, and the chat UI
(`frontend/src/components/AskSheet.jsx`) swaps any that slip through for commas.

---

## Contact

Privacy or data questions: connect@mandapmaps.in

---

## Data

The Ganpati dataset (`seed-data.json`) is private and shared by hand, so it is
not committed to this repo. The chatbot ships a `seed-data.example.json` you can
use to test the pipeline without the real dataset.
test
test
2test
