import { Router } from 'express';
import { addLocationPing } from '../repositories/locationRepo.js';

const router = Router();

// POST /api/locations/ping  -> anonymous "I am here right now" signal
router.post('/ping', async (req, res, next) => {
  const { sessionId, lat, lng } = req.body || {};
  if (!sessionId || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'sessionId, lat, lng required' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'lat/lng out of range' });
  }
  try {
    await addLocationPing(String(sessionId).slice(0, 64), lat, lng);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;