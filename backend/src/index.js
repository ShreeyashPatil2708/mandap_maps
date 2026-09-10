import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { loadSecrets } from './config/secrets.js';
import { query } from './config/db.js';
import ganpatisRouter from './routes/ganpatis.js';

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

  // Behind Cloudflare -> ALB, so the socket IP is an AWS hop, not the visitor.
  // Both hops append to X-Forwarded-For (client, then Cloudflare edge), so trust
  // two proxy hops for req.ip to resolve to the real client; without this the
  // rate limiter buckets every visitor under one shared upstream IP. A fixed
  // count (not `true`) stops a client-supplied XFF header from spoofing the key,
  // and the ALB only accepts traffic from Cloudflare anyway.
  app.set('trust proxy', 2);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : true }));

  // Rate limit per client IP (architecture target: 1000 req/min). With
  // `trust proxy` set above, the default keyGenerator (req.ip) resolves to the
  // real visitor. Cloudflare also rate-limits at the edge; this is defence in depth.
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
