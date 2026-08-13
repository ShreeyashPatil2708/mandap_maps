# MandapMaps

A mobile-first darshan companion for Pune's **Ganeshotsav** festival: find pandals, plan your
route, and learn the history of Pune's beloved Ganpatis.

## Monorepo layout

```
.
├── frontend/               # Vite + React + Tailwind (builds to static, S3, CloudFront)
│   ├── src/
│   ├── tailwind.config.js  # Exact design tokens (maroon/gold/cream, serif + devanagari)
│   └── .env.example
├── backend/                # Express API (PostgreSQL + Redis)
│   ├── src/
│   │   ├── index.js        # Server bootstrap (helmet, CORS, rate limit, /health)
│   │   └── config/         # db (pg), redis (ioredis), secrets (AWS Secrets Manager)
│   ├── db/
│   │   ├── schema.sql      # ganpatis table
│   │   ├── migrate.js      # apply schema
│   │   ├── seed.js         # seed all 45 Ganpatis (idempotent upsert)
│   │   └── seed-data.json  # generated from data/MandapMaps_*.xlsx (gitignored)
│   └── .env.example
├── data/                   # Source spreadsheet
├── eslint.config.js        # Flat config for frontend (React) + backend (Node)
└── .prettierrc.json
```

## Architecture (target)

- Frontend → static build → **S3** → **CloudFront**
- API behind **API Gateway** (rate limit 1000 req/min per IP)
- Reads served from **ElastiCache Redis** (24h TTL), falling back to **RDS PostgreSQL** on miss
- Secrets from **AWS Secrets Manager**; credentials are never hardcoded
- Route planner emits a Google Maps deep link only (no Maps API key)

## Getting started (local)

Prerequisites: Node 20+ and Docker Desktop (running).

```bash
npm install                               # installs all workspaces

# 1. Start Postgres + Redis in Docker (no local install needed)
docker-compose up -d

# 2. Backend
cp backend/.env.example backend/.env      # then edit PGPASSWORD to match docker-compose
npm run migrate --workspace backend       # create the tables (idempotent)
npm run seed --workspace backend          # load all 45 Ganpatis (idempotent)
npm run dev:backend                       # http://localhost:4000/health

# 3. Frontend (new terminal)
cp frontend/.env.example frontend/.env
npm run dev:frontend                      # http://localhost:5173
```

Stop the database when done: `docker-compose down` (add `-v` to also wipe the data).

## Tooling

```bash
npm run lint          # ESLint (flat config)
npm run format        # Prettier write
```

## Status

**Phase 1 complete:** project scaffold, design tokens, ESLint + Prettier, `.env.example` files,
PostgreSQL schema, and the seed of all 45 Ganpatis. Frontend components and AWS infrastructure are
built in later phases.
# MandapMaps
# MandapMaps
# MandapMaps
