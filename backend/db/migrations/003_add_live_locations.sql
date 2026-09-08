CREATE TABLE IF NOT EXISTS live_locations (
    id          SERIAL PRIMARY KEY,
    session_id  TEXT         NOT NULL,   -- same anonymous id from session.js (Phase 2)
    latitude    NUMERIC(9,6) NOT NULL,
    longitude   NUMERIC(9,6) NOT NULL,
    pinged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS live_locations_time_idx ON live_locations (pinged_at DESC);
CREATE INDEX IF NOT EXISTS live_locations_session_idx ON live_locations (session_id, pinged_at DESC);