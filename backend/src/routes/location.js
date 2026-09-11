import { Router } from 'express';
import { addLocationPing } from '../repositories/locationRepo.js';
import { claimCooldown } from '../config/redis.js';

const router = Router();
const PING_COOLDOWN_SECONDS = 30; // at most one stored ping per session per 30s

// SECURITY INVARIANT: this router only *ingests* location. There is deliberately
// no endpoint that returns raw pings. getRecentPings() is read only by the
// in-process crowd aggregator, and the public /api/crowd endpoint exposes just
// aggregate crowd levels, never individual coordinates. Do not add a route that
// returns rows from live_locations.

const isLat = (n) => Number.isFinite(n) && n >= -90 && n <= 90;
const isLng = (n) => Number.isFinite(n) && n >= -180 && n <= 180;

// POST /api/locations/ping  -> anonymous "I am here right now" signal
router.post('/ping', async (req, res, next) => {
  try {
    const { sessionId, lat, lng } = req.body || {};
    const sid = typeof sessionId === 'string' ? sessionId.trim().slice(0, 64) : '';
    if (!sid || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'sessionId, lat, lng required' });
    }
    if (!isLat(lat) || !isLng(lng)) {
      return res.status(400).json({ error: 'lat/lng out of range' });
    }

    // Throttle per session so the endpoint can't be spammed to flood the table
    // or skew crowd inference.
    if (!(await claimCooldown(`loc:cooldown:${sid}`, PING_COOLDOWN_SECONDS))) {
      return res.status(429).json({ error: 'Please wait before sending another location.' });
    }

    await addLocationPing(sid, lat, lng);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
