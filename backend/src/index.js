import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { loadSecrets } from './config/secrets.js';
import { query } from './config/db.js';
import ganpatisRouter from './routes/ganpatis.js';
import crowdRouter from './routes/crowd.js';   // add this import near the top with the others
import locationRouter from './routes/location.js';
import { runCrowdAggregation } from './jobs/crowdAggregator.js';

/**
 * Cheap connectivity probe used at startup and by the /ready endpoint. Runs a
 * trivial query so a bad DB config surfaces as a real signal instead of hiding
 * until the first API request.
 */
async function pingDb() {
  await query('SELECT 1');
}

/**
 * Bounded startup probe. Logs the DB connectivity result but never crashes the
 * process: a transient blip at boot should not put the service into a restart
 * loop. Readiness (/ready) and the CD health gate are the real guardrails.
 */
async function probeDbAtStartup(retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pingDb();
      // eslint-disable-next-line no-console
      console.log('DB connectivity OK');
      return;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`DB probe ${attempt}/${retries} failed:`, err.code || err.message);
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  // eslint-disable-next-line no-console
  console.error('DB not reachable at startup; serving anyway (/ready will report not-ready).');
}

/**
 * Server bootstrap. Wires up security middleware, CORS, rate limiting,
 * a health check, and the read-only Ganpati API (Redis-cached, RDS-backed).
 */
async function createApp() {
  // Pull DB/Redis creds from Secrets Manager in prod (no-op locally).
  await loadSecrets();

  // Log DB reachability once creds are loaded (non-fatal, see probeDbAtStartup).
  await probeDbAtStartup();

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : true }));

  // Rate limit (architecture target: 1000 req/min per IP). API Gateway also
  // enforces this in prod; this is defence in depth.
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
      max: Number(process.env.RATE_LIMIT_MAX) || 1000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Liveness: the process is up. Used by the ALB and ASG health checks, so it
  // must NOT touch the DB (an RDS blip should not cause instance cycling).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mandapmaps-api', time: new Date().toISOString() });
  });

  // Readiness: the DB is actually reachable. The CD deploy gate polls this after
  // restarting the service and rolls back if it never goes green.
  app.get('/ready', async (_req, res) => {
    try {
      await pingDb();
      res.json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'not-ready', error: err.code || 'db-unreachable' });
    }
  });

  app.use('/api/ganpatis', ganpatisRouter);

  
////////
  app.use('/api/ganpatis', crowdRouter);   // handles /api/ganpatis/:id/crowd-report and /:id/crowd
  app.use('/api/crowd', crowdRouter);      // handles /api/crowd (all levels)
  app.use('/api/locations', locationRouter);
  // JSON error handler (keeps stack traces out of responses).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('API error', err);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}

const port = Number(process.env.PORT) || 4000;

createApp()
  .then((app) => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`mandapmaps-api listening on :${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err);
    process.exit(1);
  });
  setInterval(() => {
    runCrowdAggregation().catch((err) => console.error('crowd aggregation failed', err));
  }, 2 * 60_000); // every 2 minutes
