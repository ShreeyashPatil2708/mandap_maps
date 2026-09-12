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

CREATE TABLE IF NOT EXISTS route_interest (
    id           SERIAL PRIMARY KEY,
    ganpati_id   INTEGER     NOT NULL REFERENCES ganpatis(id) ON DELETE CASCADE,
    session_id   TEXT        NOT NULL,   -- random id generated client-side, not tied to any account
    pinged_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS route_interest_ganpati_time_idx
    ON route_interest (ganpati_id, pinged_at DESC);

-- Supports the aggregator's purge of expired interest rows (by time only).
CREATE INDEX IF NOT EXISTS route_interest_time_idx
    ON route_interest (pinged_at);


CREATE TABLE IF NOT EXISTS live_locations (
    id          SERIAL PRIMARY KEY,
    session_id  TEXT         NOT NULL,   -- same anonymous id from session.js (Phase 2)
    latitude    NUMERIC(9,6) NOT NULL,
    longitude   NUMERIC(9,6) NOT NULL,
    pinged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS live_locations_time_idx ON live_locations (pinged_at DESC);
CREATE INDEX IF NOT EXISTS live_locations_session_idx ON live_locations (session_id, pinged_at DESC);


-- ─────────────────────────────────────────────────────────────
-- Background job coordination
-- ─────────────────────────────────────────────────────────────
-- Every API instance runs the same timers; a job atomically claims its run
-- window here so only one instance does the work per window.
CREATE TABLE IF NOT EXISTS job_runs (
    name      TEXT        PRIMARY KEY,
    last_run  TIMESTAMPTZ NOT NULL
);


-- ─────────────────────────────────────────────────────────────
-- Live crowd estimate from opted-in location sharing
-- ─────────────────────────────────────────────────────────────
-- One current row per mandal, replaced by the crowd aggregator every run.
-- Kept apart from crowd_reports (people's taps) so the automated signal can
-- never outnumber real reports; it is only shown when nobody has tapped.
CREATE TABLE IF NOT EXISTS crowd_estimates (
    ganpati_id  INTEGER     PRIMARY KEY REFERENCES ganpatis(id) ON DELETE CASCADE,
    level       SMALLINT    NOT NULL,   -- 1 = Low, 2 = Medium, 3 = High
    nearby      INTEGER     NOT NULL,   -- distinct sharing devices within range
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT crowd_estimates_level_chk CHECK (level IN (1, 2, 3))
);


-- ─────────────────────────────────────────────────────────────
-- Shared cooldowns and rate limits
-- ─────────────────────────────────────────────────────────────
-- Counters shared by every API instance (Redis is per box, so its keys are
-- not). A row is a counter for `key` that expires at reset_at.
CREATE TABLE IF NOT EXISTS rate_counters (
    key       TEXT        PRIMARY KEY,
    count     INTEGER     NOT NULL,
    reset_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_counters_reset_idx ON rate_counters (reset_at);

-- ─────────────────────────────────────────────────────────────
-- Data repair: dead Google Maps links
-- ─────────────────────────────────────────────────────────────
-- The companion spreadsheet carried invented short links of the form
-- maps.app.goo.gl/<PandalName>, and every one of them 404s: a real short link is
-- a random code, never a readable name. Replace them with a coordinate search
-- URL (the same link the app builds for "Open in Google Maps"), or clear the
-- column when a record has no coordinates, so nothing serves a dead link.
--
-- Idempotent: no row matches once it has run. db/generate-seed-data.py no longer
-- emits these values, so a re-seed will not bring them back. See
-- db/migrations/006_fix_google_maps_url.sql.
UPDATE ganpatis
SET google_maps_url = CASE
        WHEN latitude IS NOT NULL AND longitude IS NOT NULL
            THEN 'https://www.google.com/maps/search/?api=1&query=' || latitude || ',' || longitude
        ELSE NULL
    END
WHERE google_maps_url LIKE '%goo.gl/%';


-- ─────────────────────────────────────────────────────────────
-- Data repair: pandal coordinates
-- ─────────────────────────────────────────────────────────────
-- Several pins sat on the wrong building: Dagdusheth's was closer to Tambdi
-- Jogeshwari than to itself, and Guruji Talim's landed on Faraskhana Police
-- Station. Each value below was matched to a named temple in OpenStreetMap or
-- Wikidata and checked by hand; see db/coordinate-corrections.json, which the
-- seed generator applies to the spreadsheet so a re-seed keeps them.
--
-- Every statement is guarded on the coordinate it replaces, so it is idempotent
-- and stops applying the moment the value is corrected at the source. The
-- remaining pins are still approximate: `npm run data:review` lists them.

-- Akhil Mandai Mandal (Sharda Ganpati): 575 m, Wikidata "Akhil Mandai Mandal"
-- https://www.wikidata.org/wiki/Q110118560
UPDATE ganpatis SET latitude = 18.51183, longitude = 73.8563
WHERE name_english = 'Akhil Mandai Mandal (Sharda Ganpati)' AND latitude = 18.517 AND longitude = 73.8562;

-- Nimbalkar Talim Ganpati: 445 m, OpenStreetMap "Nimbalkar Talim Ganpati Mandir"
-- https://www.openstreetmap.org/node/12176170904
UPDATE ganpatis SET latitude = 18.511927, longitude = 73.852217
WHERE name_english = 'Nimbalkar Talim Ganpati' AND latitude = 18.5118 AND longitude = 73.848;

-- Jejuri Khandoba Temple (Ganesh presence): 392 m, Wikidata "Khandoba Temple, Jejuri"
-- https://www.wikidata.org/wiki/Q110823714
UPDATE ganpatis SET latitude = 18.272384, longitude = 74.160418
WHERE name_english = 'Jejuri Khandoba Temple (Ganesh presence)' AND latitude = 18.271 AND longitude = 74.157;

-- Hutatma Babu Genu Ganpati (Navsacha Ganpati): 325 m, Wikidata "Hutatma Babu Genu Mandal"
-- https://www.wikidata.org/wiki/Q110120249
UPDATE ganpatis SET latitude = 18.513924, longitude = 73.856333
WHERE name_english = 'Hutatma Babu Genu Ganpati (Navsacha Ganpati)' AND latitude = 18.5168 AND longitude = 73.8558;

-- Hatti Ganpati Mandal: 242 m, OpenStreetMap "Hatti Ganpati Mandir"
-- https://www.openstreetmap.org/node/2536024948
UPDATE ganpatis SET latitude = 18.511223, longitude = 73.845858
WHERE name_english = 'Hatti Ganpati Mandal' AND latitude = 18.512 AND longitude = 73.848;

-- Phadke Haud Ganpati: 228 m, Wikidata "Phadke Wada Ganpati"
-- https://www.wikidata.org/wiki/Q98803788
UPDATE ganpatis SET latitude = 18.517867, longitude = 73.858764
WHERE name_english = 'Phadke Haud Ganpati' AND latitude = 18.5189 AND longitude = 73.8569;

-- Guruji Talim Ganpati: 184 m, OpenStreetMap "Guruji Talim"
-- https://www.openstreetmap.org/node/5832579354
UPDATE ganpatis SET latitude = 18.515047, longitude = 73.85466
WHERE name_english = 'Guruji Talim Ganpati' AND latitude = 18.5163 AND longitude = 73.8558;

-- Tambdi Jogeshwari: 172 m, Wikidata "Tambdi Jogeshwari Temple and Deepmaal"
-- https://www.wikidata.org/wiki/Q98801548
UPDATE ganpatis SET latitude = 18.516602, longitude = 73.854874
WHERE name_english = 'Tambdi Jogeshwari' AND latitude = 18.5175 AND longitude = 73.8562;

-- Tulshibaug Ganpati: 165 m, Wikidata "Tulshibaug Ganapati Temple"
-- https://www.wikidata.org/wiki/Q19807630
UPDATE ganpatis SET latitude = 18.514317, longitude = 73.855426
WHERE name_english = 'Tulshibaug Ganpati' AND latitude = 18.5158 AND longitude = 73.8553;

-- Peshwe Ganpati (Shaniwarwada Ganpati): 161 m, OpenStreetMap "Shrimant Peshwe Ganesh Mandir"
-- https://www.openstreetmap.org/way/327073026
UPDATE ganpatis SET latitude = 18.518808, longitude = 73.856079
WHERE name_english = 'Peshwe Ganpati (Shaniwarwada Ganpati)' AND latitude = 18.5196 AND longitude = 73.8548;

-- Dagdusheth Halwai Ganpati: 90 m, OpenStreetMap "Shreemant Dagdusheth Halwai Ganpati Mandir"
-- https://www.openstreetmap.org/way/264276391
UPDATE ganpatis SET latitude = 18.516391, longitude = 73.856084
WHERE name_english = 'Dagdusheth Halwai Ganpati' AND latitude = 18.5167 AND longitude = 73.8553;
