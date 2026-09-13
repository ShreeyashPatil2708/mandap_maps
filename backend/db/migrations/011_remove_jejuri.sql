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
