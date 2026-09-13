import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadSecrets } from '../src/config/secrets.js';
import { getPool, closePool } from '../src/config/db.js';
import { getRedis } from '../src/config/redis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Apply db/schema.sql to the target database. */
async function migrate() {
  await loadSecrets();
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf-8');
  await getPool().query(sql);
  console.log('Schema applied.');
}

/**
 * Drop the cached Ganpati responses (routes/ganpatis.js), so data a migration
 * just changed (a corrected name, a cleared pin) is served on the next request
 * instead of after the 24h TTL. Every deploy migrates on each API instance
 * against its own on-box Redis, so this clears the cache wherever it lives.
 * Best effort: with no Redis the API reads the database directly anyway.
 */
async function dropGanpatiCache() {
  const redis = getRedis();
  try {
    const keys = [];
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', 'ganpatis:*', 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    if (keys.length) await redis.del(...keys);
    console.log(`Ganpati cache cleared (${keys.length} keys).`);
  } catch (err) {
    console.log(`Ganpati cache not cleared (${err.message}); entries expire on their TTL.`);
  }
}

migrate()
  .then(dropGanpatiCache)
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
    // disconnect() rather than quit(): it returns at once even when Redis is
    // unreachable and the client is mid-reconnect, so a missing Redis can never
    // leave the deploy's migrate step hanging.
    getRedis().disconnect();
  });
