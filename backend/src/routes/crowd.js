import { Router } from 'express';

import {
  addCrowdReport,
  getCrowdLevel,
  getCombinedCrowdLevels,
  getCombinedCrowdLevelsByName,
  pingInterest,
} from '../repositories/crowdRepo.js';
import { getIdByName } from '../repositories/ganpatiRepo.js';
import { claimSharedCooldown } from '../repositories/limitsRepo.js';
import { getRedis } from '../config/redis.js';

const ALL_KEY = 'crowd:all';
const CROWD_TTL_SECONDS = 90; // short TTL: crowd data must stay fresh, unlike the 24h ganpati cache
const REPORT_COOLDOWN_SECONDS = 5 * 60; // one report per session per mandal per 5 minutes
const INTEREST_COOLDOWN_SECONDS = 10 * 60; // one interest ping per session per mandal per 10 minutes
const MAX_NAME_LENGTH = 200;
const NO_DATA = { level: null, label: 'No data yet', source: null, reportCount: 0 };

/** Positive integer id from a route param, or null. */
function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Anonymous client session id: a non-empty string, trimmed and capped, or null. */
function parseSessionId(raw) {
  if (typeof raw !== 'string') return null;
  const sid = raw.trim().slice(0, 64);
  return sid || null;
}

// ---------------------------------------------------------------------------
// Per-Ganpati crowd routes, mounted at /api/ganpatis
// ---------------------------------------------------------------------------
export const ganpatiCrowdRouter = Router();

// GET /api/ganpatis/by-name/:name/crowd  -> crowd level looked up by exact name.
// Used by the chatbot, which only knows the Ganpati's name, not its numeric id.
// Express has already percent-decoded the param; decoding again would throw on
// a literal "%" and crash the request.
ganpatiCrowdRouter.get('/by-name/:name/crowd', async (req, res, next) => {
  try {
    const name = req.params.name.trim();
    if (!name || name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: 'invalid name' });
    }
    const id = await getIdByName(name);
    if (!id) return res.status(404).json({ error: 'ganpati not found' });
    res.json((await getCrowdLevel(id)) || NO_DATA);
  } catch (err) {
    next(err);
  }
});

// POST /api/ganpatis/:id/crowd-report  -> anyone can submit Low/Medium/High
ganpatiCrowdRouter.post('/:id/crowd-report', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const level = Number(req.body?.level);
    const sessionId = parseSessionId(req.body?.sessionId);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    if (![1, 2, 3].includes(level)) {
      return res.status(400).json({ error: 'level must be 1 (Low), 2 (Medium), or 3 (High)' });
    }
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    // Shared across instances (Postgres), so hopping ALB targets can't bypass it.
    if (!(await claimSharedCooldown(`report:${sessionId}:${id}`, REPORT_COOLDOWN_SECONDS))) {
      return res
        .status(429)
        .json({ error: 'You already reported this mandal recently. Please wait a few minutes.' });
    }

    await addCrowdReport(id, level);
    // Bust this instance's "all crowd levels" cache so its next read picks up
    // the report. Other instances' caches expire within CROWD_TTL_SECONDS.
    try {
      await getRedis().del(ALL_KEY);
    } catch {
      // Non-fatal: the cache expires on its own short TTL.
    }
    // Reply with the fresh level straight from the DB, so the reporter sees the
    // result immediately no matter which instance serves their next read.
    res.status(201).json({ ok: true, crowd: (await getCrowdLevel(id)) || NO_DATA });
  } catch (err) {
    next(err);
  }
});

// GET /api/ganpatis/:id/crowd  -> current crowd level for one Ganpati
ganpatiCrowdRouter.get('/:id/crowd', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    res.json((await getCrowdLevel(id)) || NO_DATA);
  } catch (err) {
    next(err);
  }
});

// POST /api/ganpatis/:id/interest  -> anonymous "I have this in my route right now" ping.
// Cooled down per session so repeated taps can't inflate a mandal's crowd level.
ganpatiCrowdRouter.post('/:id/interest', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sessionId = parseSessionId(req.body?.sessionId);
    if (!id || !sessionId) return res.status(400).json({ error: 'invalid id or sessionId' });

    if (!(await claimSharedCooldown(`interest:${sessionId}:${id}`, INTEREST_COOLDOWN_SECONDS))) {
      // Already counted recently; nothing new to record.
      return res.status(200).json({ ok: true });
    }
    await pingInterest(id, sessionId);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Aggregate crowd routes, mounted at /api/crowd
// ---------------------------------------------------------------------------
export const crowdRouter = Router();

// GET /api/crowd  -> crowd levels for every Ganpati at once (for map/list views)
crowdRouter.get('/', async (_req, res, next) => {
  const redis = getRedis();
  try {
    const hit = await redis.get(ALL_KEY);
    if (hit) return res.json(JSON.parse(hit));
  } catch {
    // Fall through to the DB.
  }
  try {
    const data = await getCombinedCrowdLevels();
    try {
      await redis.set(ALL_KEY, JSON.stringify(data), 'EX', CROWD_TTL_SECONDS);
    } catch {
      // Non-fatal.
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/crowd/by-name  -> [{ name, level, label }] for every mandal with data.
// Used by the chatbot to answer "which mandal is least crowded" style questions.
crowdRouter.get('/by-name', async (_req, res, next) => {
  try {
    res.json(await getCombinedCrowdLevelsByName());
  } catch (err) {
    next(err);
  }
});
