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
 * Server bootstrap. Wires up security middleware, CORS, rate limiting,
 * a health check, and the read-only Ganpati API (Redis-cached, RDS-backed).
 */
async function createApp() {
  // Pull DB/Redis creds from Secrets Manager in prod (no-op locally).
  await loadSecrets();

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
      // eslint-disable-next-line no-console
      console.error('Readiness check failed', err);
      res.status(503).json({ status: 'not-ready' });
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

    // Only start the crowd job once the server itself has started successfully.
    setInterval(() => {
      runCrowdAggregation().catch((err) => console.error('crowd aggregation failed', err));
    }, 2 * 60_000); // every 2 minutes
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err);
    process.exit(1);
  });
