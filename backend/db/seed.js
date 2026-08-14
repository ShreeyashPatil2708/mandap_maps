import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadSecrets } from '../src/config/secrets.js';
import { getPool, closePool } from '../src/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Columns inserted per row (order matters, matches the VALUES list below).
const COLUMNS = [
  'name_english',
  'name_marathi',
  'manacha_number',
  'tier',
  'area',
  'year_established',
  'history_english',
  'history_marathi',
  'significance_short',
  'idol_description',
  'mandir_address',
  'pandal_address',
  'latitude',
  'longitude',
  'morning_aarti',
  'evening_aarti',
  'special_events',
  'category',
  'tags',
  'did_you_know',
  'metro',
  'food',
  'photo_url',
  'google_maps_url',
  'is_manacha',
  'data_verified',
];

// jsonb columns must be sent as JSON text; TEXT[] (tags) is handled by pg natively.
const JSONB_COLUMNS = new Set(['metro', 'food']);

/**
 * Seed the ganpatis table from db/seed-data.json (generated from the
 * MandapMaps 2026 spreadsheets, all 45 Ganpatis). Idempotent:
 * re-running upserts on name_english.
 */
async function seed() {
  await loadSecrets();

  const raw = await readFile(join(__dirname, 'seed-data.json'), 'utf-8');
  const records = JSON.parse(raw);

  const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
  const updates = COLUMNS.filter((c) => c !== 'name_english')
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');

  const sql = `
    INSERT INTO ganpatis (${COLUMNS.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (name_english) DO UPDATE SET ${updates}, updated_at = NOW()
  `;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        sql,
        COLUMNS.map((c) => {
          const v = r[c] === undefined ? null : r[c];
          return JSONB_COLUMNS.has(c) ? JSON.stringify(v ?? []) : v;
        })
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${records.length} ganpatis.`);
}

seed()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(closePool);
