import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { loadSecrets } from './config/secrets.js';
import { query, closePool } from './config/db.js';
import { closeRedis } from './config/redis.js';
import { PgRateLimitStore } from './repositories/limitsRepo.js';
import ganpatisRouter from './routes/ganpatis.js';
import { ganpatiCrowdRouter, crowdRouter } from './routes/crowd.js';
import locationRouter from './routes/location.js';
import { runCrowdAggregation } from './jobs/crowdAggregator.js';

const isProd = process.env.NODE_ENV === 'production';
const AGGREGATION_INTERVAL_MS = 2 * 60_000;
const SHUTDOWN_GRACE_MS = 10_000;

/**
 * How many proxies in front of the app append to X-Forwarded-For. Production
 * traffic is Cloudflare -> CloudFront -> ALB -> app, so the real client IP is
 * the 3rd entry from the right. Without this every visitor shares the ALB's IP
 * and one per-IP rate-limit bucket. 0 (off) locally.
 */
function trustProxyHops() {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw !== undefined && raw !== '') return Math.max(0, Number(raw) || 0);
  return isProd ? 3 : 0;
}

/** Map a thrown error to a safe HTTP status (never leaks internals to the client). */
function statusForError(err) {
  // body-parser and friends: malformed JSON, payload too large, etc.
  const status = err.status || err.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) return status;
  // Postgres: referenced ganpati does not exist.
  if (err.code === '23503') return 404;
  // Postgres: bad input (invalid text representation, out of range, check violation).
  if (['22P02', '22003', '23514'].includes(err.code)) return 400;
  return 500;
}

const ERROR_MESSAGES = {
  400: 'bad request',
  404: 'not found',
  413: 'payload too large',
  500: 'internal error',
};

/**
 * Server bootstrap. Wires up security middleware, CORS, rate limiting,
 * health checks, and the Ganpati / crowd / location API (Redis-cached, RDS-backed).
 */
async function createApp() {
  // Pull DB/Redis creds from Secrets Manager in prod (no-op locally).
  await loadSecrets();

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops());
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // The SPA calls /api same-origin in production, so CORS only matters for
  // local dev. Fail closed in production if no origins are configured instead
  // of reflecting any origin.
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : !isProd }));

  // Global per-IP rate limit (defence in depth alongside the edge).
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
      max: Number(process.env.RATE_LIMIT_MAX) || 1000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Tighter per-IP limits for the anonymous write endpoints, which feed the
  // public crowd levels.
  const writeLimit = {
    windowMs: 60_000,
    max: Number(process.env.WRITE_RATE_LIMIT_MAX) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method !== 'POST',
  };
  // Crowd taps and route interest set crowd levels directly, so their limit
  // is counted in Postgres and holds across the whole fleet (the default store
  // is per process, so N instances would allow N times the limit). A DB blip
  // lets requests through rather than blocking them.
  const sharedWriteLimiter = rateLimit({
    ...writeLimit,
    store: new PgRateLimitStore('rl:write'),
    passOnStoreError: true,
  });
  // Location pings stay on the cheap per-instance store on purpose: they are
  // the high-volume write (one per sharing device per minute), and repeats
  // from one device can't skew crowd counts, because the aggregator only uses
  // each session's latest ping.
  const pingLimiter = rateLimit(writeLimit);

  // Shallow liveness: the process is up and serving.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mandapmaps-api', time: new Date().toISOString() });
  });

  // Deep readiness: the app can actually reach the database. The CD deploy
  // probes this before declaring a rollout healthy (see .github/workflows/cd.yml),
  // so a bad DB connection fails the deploy instead of going live broken.
  app.get('/ready', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (err) {
      console.error('Readiness check failed', err);
      res.status(503).json({ status: 'not-ready' });
    }
  });

  app.use('/api/ganpatis', sharedWriteLimiter);
  app.use('/api/locations', pingLimiter);

  app.use('/api/ganpatis', ganpatisRouter);
  // /:id/crowd-report, /:id/crowd, /:id/interest, /by-name/:name/crowd
  app.use('/api/ganpatis', ganpatiCrowdRouter);
  // / and /by-name
  app.use('/api/crowd', crowdRouter);
  app.use('/api/locations', locationRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

  // JSON error handler (keeps stack traces out of responses).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = statusForError(err);
    if (status >= 500) {
      console.error('API error', err);
    }
    res.status(status).json({ error: ERROR_MESSAGES[status] || 'request failed' });
  });

  return app;
}

/** Run the crowd job on a timer, never overlapping a still-running pass. */
function startCrowdAggregation() {
  let running = false;
  return setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await runCrowdAggregation();
    } catch (err) {
      console.error('crowd aggregation failed', err);
    } finally {
      running = false;
    }
  }, AGGREGATION_INTERVAL_MS);
}

const port = Number(process.env.PORT) || 4000;

createApp()
  .then((app) => {
    const server = app.listen(port, () => {
      console.log(`mandapmaps-api listening on :${port}`);
    });

    // Only start the crowd job once the server itself has started successfully.
    const aggregationTimer = startCrowdAggregation();

    // Graceful shutdown (systemd restart on every deploy sends SIGTERM): stop
    // accepting connections, let in-flight requests finish, then close pools.
    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} received, shutting down`);
      clearInterval(aggregationTimer);
      setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
      server.close(async () => {
        await Promise.allSettled([closePool(), closeRedis()]);
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
