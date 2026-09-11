import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadSecrets } from '../src/config/secrets.js';
import { getPool, closePool } from '../src/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Apply db/schema.sql to the target database. */
async function migrate() {
  await loadSecrets();
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf-8');
  await getPool().query(sql);
  console.log('Schema applied.');
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(closePool);
