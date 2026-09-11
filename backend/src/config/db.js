import pg from 'pg';

const { Pool } = pg;

let pool;

/**
 * Build the pg Pool config from env. Prefers DATABASE_URL if present,
 * otherwise falls back to discrete PG* vars. RDS in prod requires TLS.
 */
function buildConfig() {
  const ssl = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false;

  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl };
  }

  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl,
  };
}

/** Lazily create and return a shared connection pool. */
export function getPool() {
  if (!pool) {
    pool = new Pool(buildConfig());
    pool.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Unexpected PG pool error', err);
    });
  }
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
