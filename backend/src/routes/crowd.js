import { Router } from 'express';
import { addCrowdReport, getCrowdLevel, getCombinedCrowdLevels } from '../repositories/crowdRepo.js';
import { getRedis } from '../config/redis.js';
import { getCombinedCrowdLevelsByName } from '../repositories/crowdRepo.js';
import { pingInterest } from '../repositories/crowdRepo.js';

const router = Router();
const ALL_KEY = 'crowd:all';
const CROWD_TTL_SECONDS = 90; // short TTL — crowd data must stay fresh, unlike the 24h ganpati cache

import { getIdByName } from '../repositories/ganpatiRepo.js';

// GET /api/ganpatis/by-name/:name/crowd  -> crowd level looked up by exact name
// Used by the chatbot, which only knows the Ganpati's name, not its numeric id.
router.get('/by-name/:name/crowd', async (req, res, next) => {
  const name = decodeURIComponent(req.params.name).trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const id = await getIdByName(name);
    if (!id) return res.status(404).json({ error: 'ganpati not found' });
    const data = await getCrowdLevel(id);
    res.json(data || { level: null, label: 'No data yet', reportCount: 0 });
  } catch (err) {
    next(err);
  }
});

const REPORT_COOLDOWN_SECONDS = 5 * 60; // one report per session per mandal per 5 minutes

// POST /api/ganpatis/:id/crowd-report  -> anyone can submit Low/Medium/High
router.post('/:id/crowd-report', async (req, res, next) => {
  const id = Number(req.params.id);
  const level = Number(req.body?.level);
  const sessionId = String(req.body?.sessionId || '').slice(0, 128);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'invalid id' });
  }
  if (![1, 2, 3].includes(level)) {
    return res.status(400).json({ error: 'level must be 1 (Low), 2 (Medium), or 3 (High)' });
  }
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }
  const cooldownKey = `crowd:cooldown:${sessionId}:${id}`;
  try {
    const redis = getRedis();
    const alreadyReported = await redis.get(cooldownKey);
    if (alreadyReported) {
      return res.status(429).json({ error: 'You already reported this mandal recently. Please wait a few minutes.' });
    }
    await redis.set(cooldownKey, '1', 'EX', REPORT_COOLDOWN_SECONDS);
  } catch {
    // If Redis is briefly unavailable, don't block a legitimate report —
    // fail open here (the global IP rate limit is still in place).
  }
  try {
    await addCrowdReport(id, level);
    // Bust the "all crowd levels" cache so the next read picks up this report.
    try {
      await getRedis().del(ALL_KEY);
    } catch {
      // Non-fatal.
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/ganpatis/:id/crowd  -> current crowd level for one Ganpati
router.get('/:id/crowd', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'invalid id' });
  }
  try {
    const data = await getCrowdLevel(id);
    res.json(data || { level: null, label: 'No data yet', reportCount: 0 });
  } catch (err) {
    next(err);
  }
});

// GET /api/crowd  -> crowd levels for every Ganpati at once (for map/list views)
router.get('/', async (_req, res, next) => {
  const redis = getRedis();
  try {
    const hit = await redis.get(ALL_KEY);
    if (hit) return res.json(JSON.parse(hit));
  } catch {
    // fall through to DB
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
router.get('/by-name', async (_req, res, next) => {
  try {
    const data = await getCombinedCrowdLevelsByName();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;



// POST /api/ganpatis/:id/interest  -> anonymous "I have this in my route right now" ping
router.post('/:id/interest', async (req, res, next) => {
  const id = Number(req.params.id);
  const sessionId = String(req.body?.sessionId || '').slice(0, 64);
  if (!Number.isInteger(id) || id < 1 || !sessionId) {
    return res.status(400).json({ error: 'invalid id or sessionId' });
  }
  try {
    await pingInterest(id, sessionId);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

