-- ─────────────────────────────────────────────────────────────
-- Crowd reporting
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crowd_reports (
    id           SERIAL PRIMARY KEY,
    ganpati_id   INTEGER     NOT NULL REFERENCES ganpatis(id) ON DELETE CASCADE,
    level        SMALLINT    NOT NULL,   -- 1 = Low, 2 = Medium, 3 = High
    reported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT crowd_reports_level_chk CHECK (level IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS crowd_reports_ganpati_time_idx
    ON crowd_reports (ganpati_id, reported_at DESC);