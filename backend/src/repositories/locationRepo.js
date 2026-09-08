import { query } from '../config/db.js';

/** Store one anonymous GPS ping. */
export async function addLocationPing(sessionId, lat, lng) {
  await query(
    `INSERT INTO live_locations (session_id, latitude, longitude) VALUES ($1, $2, $3)`,
    [sessionId, lat, lng]
  );
}

/** Most recent ping per session in the last N minutes — one row per person, not per ping. */
export async function getRecentPings(windowMinutes = 5) {
  const { rows } = await query(
    `SELECT DISTINCT ON (session_id) session_id, latitude, longitude
     FROM live_locations
     WHERE pinged_at > NOW() - INTERVAL '${windowMinutes} minutes'
     ORDER BY session_id, pinged_at DESC`
  );
  return rows;
}

/** Housekeeping: delete pings older than N minutes so the table doesn't grow forever. */
export async function purgeOldPings(olderThanMinutes = 30) {
  await query(`DELETE FROM live_locations WHERE pinged_at < NOW() - INTERVAL '${olderThanMinutes} minutes'`);
}