import { query } from '../config/db.js';
import { getAllGanpatis } from './ganpatiRepo.js';

// How a mandal's crowd level is decided, strongest signal first:
//   1. reports:  people tapped Low/Medium/High in the last WINDOW_MINUTES
//                (the average of those taps; crowd_reports holds taps only)
//   2. location: the live estimate from opted-in location sharing, written by
//                the crowd aggregator (one current row per mandal)
//   3. interest: how many people have the mandal in their route right now
// The first signal that exists wins; with none, the level is null ("No data yet").

// Only taps from the last WINDOW_MINUTES count. Older ones are stale.
const WINDOW_MINUTES = 45;

// A location estimate older than this is ignored, so a stalled aggregator
// can never leave a stale level showing.
const ESTIMATE_MAX_AGE_MINUTES = 10;

// Route-interest window, and how long interest rows (which carry the anonymous
// session id) are kept at all before the aggregator purges them.
const INTEREST_WINDOW_MINUTES = 60;
const INTEREST_RETENTION_MINUTES = 120;

const LEVEL_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };
const NO_DATA_LABEL = 'No data yet';

/** Rough crowd level from route interest alone, or null when there is none. */
function levelFromInterest(interestedCount) {
  if (interestedCount >= 15) return 3;
  if (interestedCount >= 6) return 2;
  if (interestedCount > 0) return 1;
  return null;
}

/**
 * Pick the level for one mandal from its three signals (see the top of this
 * file). Returns null when there is no signal at all.
 *   reported: { level, reportCount } | undefined
 *   estimate: { level } | undefined
 */
function combineLevel(reported, estimate, interestedCount = 0) {
  let level = null;
  let source = null;
  if (reported?.reportCount > 0) {
    level = reported.level;
    source = 'reports';
  } else if (estimate?.level) {
    level = estimate.level;
    source = 'location';
  } else {
    level = levelFromInterest(interestedCount);
    source = level ? 'interest' : null;
  }
  if (!level) return null;
  return {
    level,
    label: LEVEL_LABELS[level],
    source,
    reportCount: reported?.reportCount || 0,
    interestedCount,
  };
}

const noData = (interestedCount = 0) => ({
  level: null,
  label: NO_DATA_LABEL,
  source: null,
  reportCount: 0,
  interestedCount,
});

/** Insert one person's crowd tap. `level` must be 1 (Low), 2 (Medium), or 3 (High). */
export async function addCrowdReport(ganpatiId, level) {
  await query(`INSERT INTO crowd_reports (ganpati_id, level) VALUES ($1, $2)`, [ganpatiId, level]);
}

/** Recent taps per mandal: { [id]: { level, reportCount } }. Pass an id to limit to one. */
async function getReportedLevels(ganpatiId = null) {
  const { rows } = await query(
    `SELECT ganpati_id, ROUND(AVG(level))::int AS avg_level, COUNT(*)::int AS report_count
     FROM crowd_reports
     WHERE reported_at > NOW() - make_interval(mins => $1)
       AND ($2::int IS NULL OR ganpati_id = $2)
     GROUP BY ganpati_id`,
    [WINDOW_MINUTES, ganpatiId]
  );
  const map = {};
  for (const row of rows) {
    map[row.ganpati_id] = { level: row.avg_level, reportCount: row.report_count };
  }
  return map;
}

/** Fresh location estimates per mandal: { [id]: { level } }. Pass an id to limit to one. */
async function getLocationEstimates(ganpatiId = null) {
  const { rows } = await query(
    `SELECT ganpati_id, level
     FROM crowd_estimates
     WHERE updated_at > NOW() - make_interval(mins => $1)
       AND ($2::int IS NULL OR ganpati_id = $2)`,
    [ESTIMATE_MAX_AGE_MINUTES, ganpatiId]
  );
  const map = {};
  for (const row of rows) map[row.ganpati_id] = { level: row.level };
  return map;
}

/**
 * Replace the live location estimates with this aggregator run's result:
 * [{ ganpatiId, level, nearby }]. Mandals missing from the list (nobody
 * nearby any more) lose their estimate.
 */
export async function replaceLocationEstimates(estimates) {
  const ids = estimates.map((e) => e.ganpatiId);
  if (ids.length) {
    await query(
      `INSERT INTO crowd_estimates (ganpati_id, level, nearby, updated_at)
       SELECT id, level, nearby, NOW()
       FROM unnest($1::int[], $2::smallint[], $3::int[]) AS t(id, level, nearby)
       ON CONFLICT (ganpati_id) DO UPDATE
         SET level = EXCLUDED.level, nearby = EXCLUDED.nearby, updated_at = EXCLUDED.updated_at`,
      [ids, estimates.map((e) => e.level), estimates.map((e) => e.nearby)]
    );
  }
  await query(`DELETE FROM crowd_estimates WHERE NOT (ganpati_id = ANY($1::int[]))`, [ids]);
}

/**
 * Current crowd level for one Ganpati. Returns null if there's no signal (so
 * the UI can show "No data yet" instead of a fake default).
 */
export async function getCrowdLevel(ganpatiId) {
  const [reported, estimates, interestedCount] = await Promise.all([
    getReportedLevels(ganpatiId),
    getLocationEstimates(ganpatiId),
    getInterestCount(ganpatiId),
  ]);
  return combineLevel(reported[ganpatiId], estimates[ganpatiId], interestedCount);
}

/** Crowd levels for every Ganpati that has any signal (paints the map/list in one call). */
export async function getCombinedCrowdLevels() {
  const [reported, estimates, interest] = await Promise.all([
    getReportedLevels(),
    getLocationEstimates(),
    getInterestCounts(),
  ]);
  const ids = new Set([...Object.keys(reported), ...Object.keys(estimates), ...Object.keys(interest)]);
  const combined = {};
  for (const id of ids) {
    const interestedCount = interest[id] || 0;
    combined[id] = combineLevel(reported[id], estimates[id], interestedCount) || noData(interestedCount);
  }
  return combined;
}

/** Same as getCombinedCrowdLevels(), but keyed by name instead of id,
 * for the chatbot, which only knows mandal names. */
export async function getCombinedCrowdLevelsByName() {
  const [combined, ganpatis] = await Promise.all([getCombinedCrowdLevels(), getAllGanpatis()]);
  return ganpatis
    .map((g) => ({ name: g.name, ...(combined[g.id] || noData()) }))
    .filter((g) => g.level !== null);
}

/** Record that some anonymous session currently has this Ganpati in their route. */
export async function pingInterest(ganpatiId, sessionId) {
  await query(`INSERT INTO route_interest (ganpati_id, session_id) VALUES ($1, $2)`, [
    ganpatiId,
    sessionId,
  ]);
}

/** Distinct sessions interested in each Ganpati in the last hour. */
export async function getInterestCounts() {
  const { rows } = await query(
    `SELECT ganpati_id, COUNT(DISTINCT session_id)::int AS interested_count
     FROM route_interest
     WHERE pinged_at > NOW() - make_interval(mins => $1)
     GROUP BY ganpati_id`,
    [INTEREST_WINDOW_MINUTES]
  );
  const map = {};
  for (const row of rows) map[row.ganpati_id] = row.interested_count;
  return map;
}

/** Distinct sessions interested in ONE Ganpati in the last hour. */
export async function getInterestCount(ganpatiId) {
  const { rows } = await query(
    `SELECT COUNT(DISTINCT session_id)::int AS interested_count
     FROM route_interest
     WHERE ganpati_id = $1
       AND pinged_at > NOW() - make_interval(mins => $2)`,
    [ganpatiId, INTEREST_WINDOW_MINUTES]
  );
  return rows[0]?.interested_count || 0;
}

/** Housekeeping: drop interest rows (and their session ids) once they no longer count. */
export async function purgeOldInterest() {
  await query(`DELETE FROM route_interest WHERE pinged_at < NOW() - make_interval(mins => $1)`, [
    INTEREST_RETENTION_MINUTES,
  ]);
}
