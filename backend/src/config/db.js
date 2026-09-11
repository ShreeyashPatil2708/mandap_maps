import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool;

/**
 * TLS options for the pool.
 *
 * In AWS (DB_SECRET_ID set) the connection to RDS is encrypted AND the server
 * certificate is verified against the committed RDS CA bundle
 * (rds-global-bundle.pem, from https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem).
 * The Amazon RDS CA is not in the system trust store, which is why the bundle
 * ships with the code. Locally, TLS is opt-in via PGSSL=true (unverified, for
 * ad-hoc tunnels only).
 */
function buildSsl() {
  if (process.env.DB_SECRET_ID) {
    return {
      ca: readFileSync(join(__dirname, 'rds-global-bundle.pem'), 'utf-8'),
      rejectUnauthorized: true,
    };
  }
  return process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false;
}

/**
 * Build the pg Pool config from env. Prefers DATABASE_URL if present,
 * otherwise falls back to discrete PG* vars.
 */
function buildConfig() {
  const ssl = buildSsl();

  // Bounded waits: without these an unreachable database makes every request
  // hang forever instead of failing fast with a 500 / 503.
  const limits = {
    max: Number(process.env.PG_POOL_MAX) || 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
  };

  if (process.env.DATABASE_URL) {
    // Strip sslmode/ssl from the URL: pg-connection-string (pg >= 8.22) turns
    // sslmode=require into its own ssl config, which would override the CA
    // verification above. TLS is governed by the ssl option instead.
    let connectionString = process.env.DATABASE_URL;
    try {
      const url = new URL(connectionString);
      url.searchParams.delete('sslmode');
      url.searchParams.delete('ssl');
      connectionString = url.toString();
    } catch {
      // Not a parseable URL (e.g. a bare DSN), leave it as-is.
    }
    return { connectionString, ssl, ...limits };
  }

  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl,
    ...limits,
  };
}

/** Lazily create and return a shared connection pool. */
export function getPool() {
  if (!pool) {
    pool = new Pool(buildConfig());
    pool.on('error', (err) => {
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
