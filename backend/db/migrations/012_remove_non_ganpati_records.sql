-- ─────────────────────────────────────────────────────────────
-- Migration 012: remove three records with no Ganpati behind them
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies.
--
-- Alandi and Dehu describe the saints' pilgrimage towns rather than any Ganpati
-- temple (the same reason Jejuri went in 011), and Pisoli is a generic locality
-- entry with no mandal named. Reasons recorded in db/removed-pandals.json, which
-- the seed generator also reads.

DELETE FROM ganpatis WHERE name_english IN (
    'Alandi Ganesh Temple (Sant Dnyaneshwar Pilgrimage Town)',
    'Dehu Ganesh Temple (Sant Tukaram Pilgrimage Town)',
    'Pisoli Ganpati Mandal'
);
