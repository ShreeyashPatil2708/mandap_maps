import { Router } from 'express';

import { getAllGanpatis, getGanpatiById } from '../repositories/ganpatiRepo.js';
import { getRedis, cacheTtl } from '../config/redis.js';

const router = Router();

const LIST_KEY = 'ganpatis:all';

/**
 * Read-through cache helper. Tries Redis (ElastiCache in prod), falls back to
 * the loader (RDS) on a miss OR any Redis error, so a Redis outage degrades to
 * direct DB reads instead of failing the request.
 */
async function cached(key, loader) {
  const redis = getRedis();
  try {
    const hit = await redis.get(key);
    if (hit) return { data: JSON.parse(hit), cache: 'hit' };
  } catch {
    // Redis unavailable: fall through to the DB.
  }

  const data = await loader();
  try {
    await redis.set(key, JSON.stringify(data), 'EX', cacheTtl());
  } catch {
    // Non-fatal: the response is served from the DB either way.
  }
  return { data, cache: 'miss' };
}

// GET /api/ganpatis  -> full list (Manache first)
router.get('/', async (_req, res, next) => {
  try {
    const { data, cache } = await cached(LIST_KEY, getAllGanpatis);
    res.set('X-Cache', cache);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/ganpatis/:id  -> single Ganpati
router.get('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'invalid id' });
  }
  try {
    const { data, cache } = await cached(`ganpatis:${id}`, () => getGanpatiById(id));
    if (!data) return res.status(404).json({ error: 'not found' });
    res.set('X-Cache', cache);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
