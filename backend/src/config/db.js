import fs from 'node:fs';

import pg from 'pg';

const { Pool } = pg;

let pool;

/**
 * Decide the TLS config for the pg pool.
 *
 * Any instance that loads its credentials from Secrets Manager (DB_SECRET_ID set,
 * i.e. every production instance) verifies the RDS server certificate against
 * AWS's bundled CA. This is deterministic: it does not depend on a PGSSL flag or on
 * the sslmode in the connection string, so config drift or a well-meaning edit
 * cannot silently disable TLS or trip SELF_SIGNED_CERT_IN_CHAIN. Local development
 * (no DB_SECRET_ID) talks to a plain docker Postgres with TLS off.
 */
function buildSsl() {
  if (!process.env.DB_SECRET_ID) return false; // local dev / docker: plain connection
  const ca = fs.readFileSync(new URL('./rds-global-bundle.pem', import.meta.url), 'utf8');
  return { ca, rejectUnauthorized: true };
}

/**
 * Build the pg Pool config from env. Prefers DATABASE_URL if present,
 * otherwise falls back to discrete PG* vars.
 */
function buildConfig() {
  const ssl = buildSsl();

  if (process.env.DATABASE_URL) {
    // Strip any sslmode= flag from the URL: node-postgres lets a connection
    // string's sslmode override the explicit `ssl` object. Removing it keeps the
    // `ssl` object above authoritative (CA verification in prod, off locally),
    // so verification behaviour never hinges on how the URL was written.
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete('sslmode');
    return { connectionString: url.toString(), ssl };
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
