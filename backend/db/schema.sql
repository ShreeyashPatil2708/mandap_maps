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

-- ─────────────────────────────────────────────────────────────
-- Data repair: placeholder pandals and unverifiable pins
-- ─────────────────────────────────────────────────────────────
-- Idempotent, like the sections above. Removals are listed with reasons in
-- db/removed-pandals.json; pin changes are recorded in
-- db/coordinate-corrections.json. The seed generator applies both over the
-- spreadsheet, so a re-seed keeps them.

-- Placeholder pandals: generic locality entries with no specific mandal behind
-- them, plus one duplicate. See db/removed-pandals.json for each reason.
DELETE FROM ganpatis WHERE name_english IN (
    'Akhil Navi Peth Hatti Ganpati',
    'Akurdi Ganpati Mandal',
    'Aundh Ganpati Mandal',
    'Balewadi Ganpati Mandal',
    'Baner Ganpati Mandal',
    'Bhosari Ganpati Mandal',
    'Bibwewadi Ganpati Mandal',
    'Camp Ganpati Mandal (East Street area)',
    'Chakan Ganpati Mandal',
    'Dapodi Ganpati Mandal',
    'Deccan Gymkhana Ganpati Mandal',
    'FC Road / JM Road Ganpati Mandal',
    'Hadapsar Ganpati Mandal',
    'Hinjewadi Ganpati Mandal',
    'Kalyani Nagar Ganpati Mandal',
    'Katraj Ganpati Mandal',
    'Kharadi Ganpati Mandal',
    'Kondhwa Ganpati Mandal',
    'Kothrud Ganpati Mandal',
    'Mohammadwadi Ganpati Mandal',
    'Moshi Ganpati Mandal',
    'Nanded City Ganpati Mandal',
    'Nigdi Ganpati Mandal',
    'Paud Road Ganpati Mandal',
    'Phugewadi Ganpati Mandal',
    'Pimple Nilakh Ganpati Mandal',
    'Pimple Saudagar Ganpati Mandal',
    'Pradhikaran Ganpati Mandal',
    'Shivajinagar Ganpati Mandal',
    'Sinhagad Road Ganpati Mandal',
    'Talawade Ganpati Mandal',
    'Undri Ganpati Mandal',
    'Viman Nagar Ganpati Mandal',
    'Wagholi Ganpati Mandal',
    'Wakad Ganpati Mandal',
    'Wanowrie Ganpati Mandal'
);

-- Pins matched to the named place on Google Maps (2026-09-13).
-- Kesariwada Ganpati: 500 m, Google Maps "Kesariwada Ganpati"
UPDATE ganpatis SET latitude = 18.515767, longitude = 73.848909,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.515767,73.848909'
WHERE name_english = 'Kesariwada Ganpati' AND latitude = 18.5135 AND longitude = 73.853;
-- Tambat Ali Ganpati (Bhausaheb Rangari Ganpati): 82 m, Google Maps "Shrimant Bhausaheb Rangari Ganpati"
UPDATE ganpatis SET latitude = 18.51754, longitude = 73.855312,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.51754,73.855312'
WHERE name_english = 'Tambat Ali Ganpati (Bhausaheb Rangari Ganpati)' AND latitude = 18.5172 AND longitude = 73.856;
-- Chhatrapati Rajaram Mandal: 188 m, Google Maps "Chhatrapati Rajaram Mandal"
UPDATE ganpatis SET latitude = 18.512386, longitude = 73.847342,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.512386,73.847342'
WHERE name_english = 'Chhatrapati Rajaram Mandal' AND latitude = 18.513 AND longitude = 73.849;
-- Garud Ganpati Mandal: 1084 m, Google Maps "Garud Ganpati"
UPDATE ganpatis SET latitude = 18.513666, longitude = 73.845667,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.513666,73.845667'
WHERE name_english = 'Garud Ganpati Mandal' AND latitude = 18.5165 AND longitude = 73.8555;
-- Jilbya Maruti Ganpati: 244 m, Google Maps "Shri Jilbya Maruti Mandal"
UPDATE ganpatis SET latitude = 18.513305, longitude = 73.854912,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.513305,73.854912'
WHERE name_english = 'Jilbya Maruti Ganpati' AND latitude = 18.5155 AND longitude = 73.855;
-- Jotyachi Talim Ganpati: 643 m, Google Maps "जोत्याची तालीम मंडळ (1 review)" (low confidence)
UPDATE ganpatis SET latitude = 18.514687, longitude = 73.862938,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.514687,73.862938'
WHERE name_english = 'Jotyachi Talim Ganpati' AND latitude = 18.516 AND longitude = 73.857;
-- Natu Baug Ganpati: 641 m, Google Maps "Natubaug Mandal"
UPDATE ganpatis SET latitude = 18.510694, longitude = 73.853819,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.510694,73.853819'
WHERE name_english = 'Natu Baug Ganpati' AND latitude = 18.5115 AND longitude = 73.8478;
-- Navjawan Mitra Mandal: 150 m, Google Maps "Navjawan mitra mandal"
UPDATE ganpatis SET latitude = 18.512686, longitude = 73.848685,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.512686,73.848685'
WHERE name_english = 'Navjawan Mitra Mandal' AND latitude = 18.514 AND longitude = 73.849;
-- Shanipar Ganpati (Bajirao Road Mandal): 829 m, Google Maps "Shanipar Mandal Ganpati Devasthan"
UPDATE ganpatis SET latitude = 18.512612, longitude = 73.852547,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.512612,73.852547'
WHERE name_english = 'Shanipar Ganpati (Bajirao Road Mandal)' AND latitude = 18.5196 AND longitude = 73.8553;
-- Munjabacha Bol Ganpati: 685 m, Google Maps "Munjabacha Bol Tarun Mandal Trust"
UPDATE ganpatis SET latitude = 18.515017, longitude = 73.849853,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.515017,73.849853'
WHERE name_english = 'Munjabacha Bol Ganpati' AND latitude = 18.517 AND longitude = 73.856;
-- Chimnya Ganapati Temple: 446 m, Google Maps "Chimnya Ganapati Mandir"
UPDATE ganpatis SET latitude = 18.511144, longitude = 73.852135,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.511144,73.852135'
WHERE name_english = 'Chimnya Ganapati Temple' AND latitude = 18.512 AND longitude = 73.848;
-- Parvati Nandan Ganpati (Khinditla Ganpati): 2455 m, Google Maps "Shri Parvatinandan Ganpati Devsthan (Khinditla)"
UPDATE ganpatis SET latitude = 18.541178, longitude = 73.829076,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.541178,73.829076'
WHERE name_english = 'Parvati Nandan Ganpati (Khinditla Ganpati)' AND latitude = 18.558 AND longitude = 73.814;
-- Ranjangaon Mahaganapati: 1033 m, Google Maps "Shree Mahaganapati Temple, Ranjangaon"
UPDATE ganpatis SET latitude = 18.754099, longitude = 74.241806,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.754099,74.241806'
WHERE name_english = 'Ranjangaon Mahaganapati' AND latitude = 18.75 AND longitude = 74.233;
-- Lenyadri Girijatmaj Ganpati: 209 m, Google Maps "Shree Girijaatmaja Ganapati Temple, Lenyadri"
UPDATE ganpatis SET latitude = 19.243453, longitude = 73.887419,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.243453,73.887419'
WHERE name_english = 'Lenyadri Girijatmaj Ganpati' AND latitude = 19.24278 AND longitude = 73.88556;
-- Morgaon Mayureshwar Ganpati: 474 m, Google Maps "Shri Mayureshwar Ganapati Temple, Morgaon"
UPDATE ganpatis SET latitude = 18.278111, longitude = 74.317461,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.278111,74.317461'
WHERE name_english = 'Morgaon Mayureshwar Ganpati' AND latitude = 18.276056 AND longitude = 74.32139;
-- Pimpri-Chinchwad Ganpati (Chinchwad Devasthan): 2284 m, Google Maps "Morya Gosavi Sanjivan Samadhi Mandir"
UPDATE ganpatis SET latitude = 18.626385, longitude = 73.778323,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.626385,73.778323'
WHERE name_english = 'Pimpri-Chinchwad Ganpati (Chinchwad Devasthan)' AND latitude = 18.6298 AND longitude = 73.7997;

-- Pins with no matching named place anywhere. The approximate coordinate is
-- cleared so the site says the location is unavailable and the Maps button
-- searches by name, instead of sending a visitor to a guessed spot.
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Alandi Ganesh Temple (Sant Dnyaneshwar Pilgrimage Town)' AND latitude = 18.674 AND longitude = 73.896;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Ambegaon Ganpati Mandal' AND latitude = 18.4524 AND longitude = 73.8511;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Bavdhan Ganpati Mandal' AND latitude = 18.5201 AND longitude = 73.7793;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Bopodi Ganpati Mandal' AND latitude = 18.5642 AND longitude = 73.8454;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Charoli Ganpati Mandal' AND latitude = 18.6612 AND longitude = 73.9052;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Dehu Ganesh Temple (Sant Tukaram Pilgrimage Town)' AND latitude = 18.659 AND longitude = 73.761;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Dhanori Ganpati Mandal' AND latitude = 18.5934 AND longitude = 73.9115;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Dhayari Ganpati Mandal' AND latitude = 18.464 AND longitude = 73.8283;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Gajanan Ganpati Mandal' AND latitude = 18.516 AND longitude = 73.856;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Ganesh Peth Mandal' AND latitude = 18.515 AND longitude = 73.857;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Kasarwadi Ganpati Mandal' AND latitude = 18.6037 AND longitude = 73.8213;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Kasba Peth Talim Ganpati' AND latitude = 18.518 AND longitude = 73.857;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Khadakwasla Ganpati Mandal' AND latitude = 18.45 AND longitude = 73.773;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Khadki Ganpati Mandal (Kirkee)' AND latitude = 18.5694 AND longitude = 73.85;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Koregaon Park Ganpati Mandal' AND latitude = 18.537 AND longitude = 73.8962;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Lohegaon Ganpati Mandal' AND latitude = 18.5821 AND longitude = 73.9145;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Mangalwar Peth Ganpati Mandal' AND latitude = 18.518 AND longitude = 73.856;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Mundhwa Ganpati Mandal' AND latitude = 18.5262 AND longitude = 73.9232;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Narayan Peth Ganpati Mandal' AND latitude = 18.513 AND longitude = 73.852;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pashan Ganpati Mandal' AND latitude = 18.5352 AND longitude = 73.8083;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pimpri Ganpati (Morya Gosavi Peth Mandal)' AND latitude = 18.6274 AND longitude = 73.7997;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pirangut Ganpati Mandal' AND latitude = 18.497 AND longitude = 73.699;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Pisoli Ganpati Mandal' AND latitude = 18.4491 AND longitude = 73.9058;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Raviwar Peth Ganpati Mandal' AND latitude = 18.517 AND longitude = 73.858;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Sangvi Ganpati Mandal' AND latitude = 18.5831 AND longitude = 73.7931;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Saswad Ganpati (Historic Maratha Town)' AND latitude = 18.344 AND longitude = 73.914;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Shukrawar Peth Ganpati Mandal' AND latitude = 18.517 AND longitude = 73.856;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Somwar Peth Ganpati Mandal' AND latitude = 18.516 AND longitude = 73.862;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Sus / Mahalunge Ganpati Mandal' AND latitude = 18.5501 AND longitude = 73.7801;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Tambe Ganpati (Shrimant Tambe Mandal)' AND latitude = 18.5122 AND longitude = 73.8495;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Twasta Kasar Ganpati Mandal' AND latitude = 18.5185 AND longitude = 73.857;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Umbrya Ganapati Temple' AND latitude = 18.511 AND longitude = 73.847;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Vishrambag Wada Ganpati' AND latitude = 18.5125 AND longitude = 73.852;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Vishrantwadi Ganpati Mandal' AND latitude = 18.5989 AND longitude = 73.9052;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Wanwadi Ganpati Mandal' AND latitude = 18.4979 AND longitude = 73.8884;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Warje Ganpati Mandal' AND latitude = 18.4812 AND longitude = 73.8132;
UPDATE ganpatis SET latitude = NULL, longitude = NULL, google_maps_url = NULL
WHERE name_english = 'Yerawada Ganpati Mandal' AND latitude = 18.5484 AND longitude = 73.8972;

-- ─────────────────────────────────────────────────────────────
-- Migration 010: correct pandal name spellings
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies. The seed generator applies the same fixes
-- (TEXT_FIXES in generate-seed-data.py), so regenerating seed-data.json from
-- the spreadsheet keeps them.
--
-- English: "Twasta Kasar" is spelt "Tvashta Kasar", as the mandal's own trust
-- (Tvashta Kasar Samaj Sanstha) and the press write it. This changes the page
-- URL to /ganpati/tvashta-kasar-ganpati-mandal.
--
-- Marathi: चिम्न्या -> चिमण्या (named for the sparrows, चिमण्या), उंब्र्या ->
-- उंबऱ्या (the umbar tree), मुंजाबाचा बोल -> मुंजाबाचा बोळ (बोळ is a lane), and
-- ताम्बे -> तांबे.

UPDATE ganpatis SET name_english = replace(name_english, 'Twasta', 'Tvashta')
WHERE name_english LIKE '%Twasta%';
UPDATE ganpatis SET history_english = replace(history_english, 'Twasta', 'Tvashta')
WHERE history_english LIKE '%Twasta%';
UPDATE ganpatis SET significance_short = replace(significance_short, 'Twasta', 'Tvashta')
WHERE significance_short LIKE '%Twasta%';
UPDATE ganpatis SET special_events = replace(special_events, 'Twasta', 'Tvashta')
WHERE special_events LIKE '%Twasta%';
UPDATE ganpatis SET did_you_know = replace(did_you_know, 'Twasta', 'Tvashta')
WHERE did_you_know LIKE '%Twasta%';

UPDATE ganpatis SET
    name_marathi = replace(replace(replace(replace(name_marathi,
        'चिम्न्या', 'चिमण्या'), 'उंब्र्या', 'उंबऱ्या'), 'मुंजाबाचा बोल', 'मुंजाबाचा बोळ'), 'ताम्बे', 'तांबे')
WHERE name_marathi LIKE '%चिम्न्या%' OR name_marathi LIKE '%उंब्र्या%'
   OR name_marathi LIKE '%मुंजाबाचा बोल%' OR name_marathi LIKE '%ताम्बे%';
UPDATE ganpatis SET
    history_marathi = replace(replace(replace(replace(history_marathi,
        'चिम्न्या', 'चिमण्या'), 'उंब्र्या', 'उंबऱ्या'), 'मुंजाबाचा बोल', 'मुंजाबाचा बोळ'), 'ताम्बे', 'तांबे')
WHERE history_marathi LIKE '%चिम्न्या%' OR history_marathi LIKE '%उंब्र्या%'
   OR history_marathi LIKE '%मुंजाबाचा बोल%' OR history_marathi LIKE '%ताम्बे%';

-- ─────────────────────────────────────────────────────────────
-- Migration 011: remove Jejuri Khandoba Temple
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies.
--
-- Jejuri is a Khandoba temple with no major Ganpati of its own, so it does not
-- belong in a Ganpati darshan guide. Reason recorded in db/removed-pandals.json,
-- which the seed generator also reads.

DELETE FROM ganpatis WHERE name_english = 'Jejuri Khandoba Temple (Ganesh presence)';
