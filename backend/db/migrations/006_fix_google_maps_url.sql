-- ─────────────────────────────────────────────────────────────
-- Migration 006: replace dead Google Maps short links
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies.
--
-- The companion spreadsheet's "Google Maps Link" column held invented short
-- links (maps.app.goo.gl/<PandalName>) that all return 404. They are replaced
-- with a coordinate search URL, identical to the one the app builds for its
-- "Open in Google Maps" button, or cleared when the record has no coordinates.
-- db/generate-seed-data.py now derives the value the same way, so a re-seed
-- keeps it correct.

UPDATE ganpatis
SET google_maps_url = CASE
        WHEN latitude IS NOT NULL AND longitude IS NOT NULL
            THEN 'https://www.google.com/maps/search/?api=1&query=' || latitude || ',' || longitude
        ELSE NULL
    END
WHERE google_maps_url LIKE '%goo.gl/%';
