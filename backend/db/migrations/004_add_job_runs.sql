-- ─────────────────────────────────────────────────────────────
-- Migration 004: background job coordination + interest purge index
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies.

CREATE TABLE IF NOT EXISTS job_runs (
    name      TEXT        PRIMARY KEY,
    last_run  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS route_interest_time_idx
    ON route_interest (pinged_at);
