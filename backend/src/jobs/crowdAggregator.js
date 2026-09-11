import { query } from '../config/db.js';
import { getAllGanpatis } from '../repositories/ganpatiRepo.js';
import { getRecentPings, purgeOldPings } from '../repositories/locationRepo.js';
import { replaceLocationEstimates, purgeOldInterest } from '../repositories/crowdRepo.js';
import { purgeExpiredLimits } from '../repositories/limitsRepo.js';

const RADIUS_METERS = 100;
const JOB_NAME = 'crowd-aggregation';
// Slightly under the 2 minute schedule, so a normal tick always wins its window
// while a second API instance ticking a few seconds later does not.
const MIN_SECONDS_BETWEEN_RUNS = 100;

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Atomically claim this run window. Every API instance runs the same timer, so
 * without this each instance would insert its own synthetic reports and a
 * 3-instance fleet would triple-count every crowd. Returns true for exactly one
 * caller per window.
 */
async function claimRun() {
  await query(
    `INSERT INTO job_runs (name, last_run) VALUES ($1, 'epoch') ON CONFLICT (name) DO NOTHING`,
    [JOB_NAME]
  );
  const { rowCount } = await query(
    `UPDATE job_runs SET last_run = NOW()
     WHERE name = $1 AND last_run < NOW() - make_interval(secs => $2)`,
    [JOB_NAME, MIN_SECONDS_BETWEEN_RUNS]
  );
  return rowCount === 1;
}

/**
 * Turn opted-in location pings into a live crowd estimate per mandal. The
 * estimates live in their own table (one current row per mandal), separate
 * from people's crowd taps, so they can never outnumber real reports; they
 * are only shown when nobody has tapped recently (see crowdRepo.js).
 */
export async function runCrowdAggregation() {
  if (!(await claimRun())) return;

  const [ganpatis, pings] = await Promise.all([getAllGanpatis(), getRecentPings(5)]);

  const estimates = [];
  for (const g of ganpatis) {
    if (g.lat == null || g.lng == null) continue;
    const nearby = pings.filter(
      (p) => distanceMeters(g.lat, g.lng, Number(p.latitude), Number(p.longitude)) <= RADIUS_METERS
    ).length;

    // Tune these thresholds against real footfall once you have festival data.
    const level = nearby >= 40 ? 3 : nearby >= 15 ? 2 : nearby > 0 ? 1 : null;
    if (level) estimates.push({ ganpatiId: g.id, level, nearby });
  }

  await replaceLocationEstimates(estimates);
  await Promise.all([purgeOldPings(30), purgeOldInterest(), purgeExpiredLimits()]);
}
