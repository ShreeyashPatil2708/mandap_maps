-- ─────────────────────────────────────────────────────────────
-- MandapMaps, PostgreSQL schema (AWS RDS db.t3.micro)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ganpatis (
    id                 SERIAL PRIMARY KEY,
    name_english       TEXT        NOT NULL,
    name_marathi       TEXT        NOT NULL,
    manacha_number     SMALLINT,                 -- 1..5 for Manache Ganpatis, NULL otherwise
    tier               SMALLINT    NOT NULL,      -- 1 Manache/Iconic, 2 Famous/Heritage, 3 Notable
    category           TEXT,                      -- e.g. "Manacha Ganpati", "Notable Sarvajanik Mandal"
    area               TEXT        NOT NULL,
    year_established   TEXT,                      -- free text ("1639", "18th century", ...)
    history_english    TEXT,
    history_marathi    TEXT,
    significance_short TEXT,
    idol_description   TEXT,
    mandir_address     TEXT,
    pandal_address     TEXT,                      -- updated yearly for the festival
    latitude           NUMERIC(9, 6),
    longitude          NUMERIC(9, 6),
    morning_aarti      TEXT,
    evening_aarti      TEXT,
    special_events     TEXT,
    tags               TEXT[]      NOT NULL DEFAULT '{}',  -- app filter chips
    did_you_know       TEXT,                      -- single surprising fact shown on the detail view
    metro              JSONB       NOT NULL DEFAULT '[]',  -- [{ name, line, dist }]
    food               JSONB       NOT NULL DEFAULT '[]',  -- [{ name, type, dist }]
    photo_url          TEXT,
    google_maps_url    TEXT,
    is_manacha         BOOLEAN     NOT NULL DEFAULT FALSE,
    data_verified      BOOLEAN     NOT NULL DEFAULT FALSE,  -- editorially verified vs. auto-seeded
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ganpatis_tier_chk CHECK (tier IN (1, 2, 3)),
    CONSTRAINT ganpatis_manacha_range_chk
        CHECK (manacha_number IS NULL OR manacha_number BETWEEN 1 AND 5),
    -- Keep the boolean and the number in sync.
    CONSTRAINT ganpatis_manacha_flag_chk
        CHECK (is_manacha = (manacha_number IS NOT NULL))
);

-- Backfill columns on databases created before these fields existed. Idempotent,
-- so `npm run migrate` can be re-run safely. (See db/migrations/ for the record.)
ALTER TABLE ganpatis ADD COLUMN IF NOT EXISTS tags          TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE ganpatis ADD COLUMN IF NOT EXISTS did_you_know  TEXT;
ALTER TABLE ganpatis ADD COLUMN IF NOT EXISTS data_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Natural key used by the seed script for idempotent upserts.
CREATE UNIQUE INDEX IF NOT EXISTS ganpatis_name_english_uidx
    ON ganpatis (name_english);

-- Only one Ganpati may hold a given Manacha position.
CREATE UNIQUE INDEX IF NOT EXISTS ganpatis_manacha_number_uidx
    ON ganpatis (manacha_number)
    WHERE manacha_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS ganpatis_tier_idx ON ganpatis (tier);
CREATE INDEX IF NOT EXISTS ganpatis_area_idx ON ganpatis (area);

-- Keep updated_at current on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ganpatis_set_updated_at ON ganpatis;
CREATE TRIGGER ganpatis_set_updated_at
    BEFORE UPDATE ON ganpatis
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
