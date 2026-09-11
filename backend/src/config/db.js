import pg from 'pg';

const { Pool } = pg;

let pool;

/**
 * Build the pg Pool config from env. Prefers DATABASE_URL if present,
 * otherwise falls back to discrete PG* vars. RDS in prod requires TLS.
 */
function buildConfig() {
  // TLS on in prod (RDS), off locally. rejectUnauthorized:false keeps the
  // connection encrypted but skips CA verification, since RDS presents an
  // Amazon-CA cert that isn't in the system trust store.
  const ssl =
    process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false;

  if (process.env.DATABASE_URL) {
    // Strip sslmode/ssl from the URL: pg-connection-string (pg >= 8.22) treats
    // sslmode=require as verify-full, which rejects the RDS cert
    // (SELF_SIGNED_CERT_IN_CHAIN). TLS is governed by the ssl option above instead.
    let connectionString = process.env.DATABASE_URL;
    try {
      const url = new URL(connectionString);
      url.searchParams.delete('sslmode');
      url.searchParams.delete('ssl');
      connectionString = url.toString();
    } catch {
      // Not a parseable URL (e.g. a bare DSN) — leave it as-is.
    }
    return { connectionString, ssl };
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
