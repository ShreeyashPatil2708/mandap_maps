import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { loadSecrets } from './config/secrets.js';
import ganpatisRouter from './routes/ganpatis.js';

/**
 * Server bootstrap. Wires up security middleware, CORS, rate limiting,
 * a health check, and the read-only Ganpati API (Redis-cached, RDS-backed).
 */
async function createApp() {
  // Pull DB/Redis creds from Secrets Manager in prod (no-op locally).
  await loadSecrets();

  const app = express();

  // Behind CloudFront -> API Gateway, so the socket IP is an AWS hop, not the
  // visitor. Trust two proxy hops so req.ip resolves to the real client from
  // X-Forwarded-For; without this the rate limiter buckets every visitor under
  // one shared upstream IP. A fixed count (not `true`) stops a client-supplied
  // XFF header from spoofing the key.
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
  // real visitor. API Gateway also throttles at the edge; this is defence in depth.
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
      max: Number(process.env.RATE_LIMIT_MAX) || 1000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mandapmaps-api', time: new Date().toISOString() });
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
