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
