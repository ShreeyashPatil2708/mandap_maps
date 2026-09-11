import { query } from '../config/db.js';

// Data minimisation: crowd detection only needs to know roughly where people
// cluster (~100 m), so we store coordinates rounded to 3 decimal places
// (~110 m). Even if this table leaked, it could not reconstruct a person's
// precise location or movement path.
const coarsen = (n) => Math.round(n * 1000) / 1000;

/** Store one anonymous, coarsened GPS ping. */
export async function addLocationPing(sessionId, lat, lng) {
  await query(`INSERT INTO live_locations (session_id, latitude, longitude) VALUES ($1, $2, $3)`, [
    sessionId,
    coarsen(lat),
    coarsen(lng),
  ]);
}

/** Most recent ping per session in the last N minutes: one row per person, not per ping. */
export async function getRecentPings(windowMinutes = 5) {
  const { rows } = await query(
    `SELECT DISTINCT ON (session_id) session_id, latitude, longitude
     FROM live_locations
     WHERE pinged_at > NOW() - make_interval(mins => $1)
     ORDER BY session_id, pinged_at DESC`,
    [windowMinutes]
  );
  return rows;
}

/** Housekeeping: delete pings older than N minutes so the table doesn't grow forever. */
export async function purgeOldPings(olderThanMinutes = 30) {
  await query(`DELETE FROM live_locations WHERE pinged_at < NOW() - make_interval(mins => $1)`, [
    olderThanMinutes,
  ]);
}
