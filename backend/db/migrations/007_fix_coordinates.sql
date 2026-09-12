-- ─────────────────────────────────────────────────────────────
-- Migration 007: correct pandal coordinates
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql, which is what `npm run migrate`
-- (and every CD deploy) applies.
--
-- Hand-checked against OpenStreetMap and Wikidata; provenance for each value is
-- in db/coordinate-corrections.json, which the seed generator applies to the
-- spreadsheet so regenerating seed-data.json keeps these fixes.

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
