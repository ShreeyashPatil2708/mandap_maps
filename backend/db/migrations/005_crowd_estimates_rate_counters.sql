-- ─────────────────────────────────────────────────────────────
-- Migration 005: live location crowd estimates + shared rate counters
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies.

CREATE TABLE IF NOT EXISTS crowd_estimates (
    ganpati_id  INTEGER     PRIMARY KEY REFERENCES ganpatis(id) ON DELETE CASCADE,
    level       SMALLINT    NOT NULL,
    nearby      INTEGER     NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT crowd_estimates_level_chk CHECK (level IN (1, 2, 3))
);

CREATE TABLE IF NOT EXISTS rate_counters (
    key       TEXT        PRIMARY KEY,
    count     INTEGER     NOT NULL,
    reset_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_counters_reset_idx ON rate_counters (reset_at);
