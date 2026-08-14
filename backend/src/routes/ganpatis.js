import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';

import { getAllGanpatis, getGanpatiById, updateGanpati } from '../repositories/ganpatiRepo.js';
import { getRedis, cacheTtl } from '../config/redis.js';

const router = Router();

const LIST_KEY = 'ganpatis:all';

/**
 * Admin guard for write endpoints. Compares the x-admin-secret header against
 * ADMIN_SECRET using a constant-time check. If ADMIN_SECRET is unset, writes are
 * disabled (every request is rejected). Responds 401 on any mismatch.
 */
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_SECRET || '';
  const provided = req.get('x-admin-secret') || '';
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  const ok = expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  return next();
}

/** Drop the cached list and single-record entry so the next read is fresh. */
async function invalidate(id) {
  try {
    await getRedis().del(LIST_KEY, `ganpatis:${id}`);
  } catch {
    // Non-fatal: entries expire on their own TTL if Redis is unavailable.
  }
}

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

// PATCH /api/ganpatis/:id  -> admin-only partial update (editorial corrections,
// marking data_verified, etc.). Guarded by the x-admin-secret header.
router.patch('/:id', requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'invalid id' });
  }
  try {
    const updated = await updateGanpati(id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'not found' });
    await invalidate(id);
    res.json(updated);
  } catch (err) {
    if (err.code === 'NO_FIELDS') {
      return res.status(400).json({ error: 'no editable fields provided' });
    }
    next(err);
  }
});

export default router;
