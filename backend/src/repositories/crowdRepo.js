import { query } from '../config/db.js';
import { getAllGanpatis } from './ganpatiRepo.js';

// Only reports from the last WINDOW_MINUTES count — older ones are considered
// stale and ignored, so the crowd level always reflects "right now".
const WINDOW_MINUTES = 45;

const LEVEL_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };

/** Insert a new crowd report. `level` must be 1 (Low), 2 (Medium), or 3 (High). */
export async function addCrowdReport(ganpatiId, level) {
  await query(
    `INSERT INTO crowd_reports (ganpati_id, level) VALUES ($1, $2)`,
    [ganpatiId, level]
  );
}

/**
 * Current crowd level for one Ganpati, averaged over recent reports.
 * Returns null if there's no recent data (so the UI can show "No data yet"
 * instead of a fake default).
 */
export async function getCrowdLevel(ganpatiId) {
  const { rows } = await query(
    `SELECT ROUND(AVG(level))::int AS avg_level, COUNT(*)::int AS report_count
     FROM crowd_reports
     WHERE ganpati_id = $1
       AND reported_at > NOW() - INTERVAL '${WINDOW_MINUTES} minutes'`,
    [ganpatiId]
  );
  const row = rows[0];

  // Self-reports win when present (they're a direct human observation).
  if (row && row.report_count > 0) {
    return {
      level: row.avg_level,
      label: LEVEL_LABELS[row.avg_level],
      reportCount: row.report_count,
    };
  }

  // No self-reports yet — fall back to route interest (people adding this
  // mandal to their route right now), same rule getCombinedCrowdLevels() uses.
  const interestedCount = await getInterestCount(ganpatiId);
  let level = null;
  if (interestedCount >= 15) level = 3;
  else if (interestedCount >= 6) level = 2;
  else if (interestedCount > 0) level = 1;

  if (!level) return null;
  return {
    level,
    label: LEVEL_LABELS[level],
    reportCount: 0,
    interestedCount,
  };
}

/** Crowd levels for every Ganpati at once (used to paint the map/list in one call). */
export async function getAllCrowdLevels() {
  const { rows } = await query(
    `SELECT ganpati_id, ROUND(AVG(level))::int AS avg_level, COUNT(*)::int AS report_count
     FROM crowd_reports
     WHERE reported_at > NOW() - INTERVAL '${WINDOW_MINUTES} minutes'
     GROUP BY ganpati_id`
  );
  const map = {};
  for (const row of rows) {
    map[row.ganpati_id] = {
      level: row.avg_level,
      label: LEVEL_LABELS[row.avg_level],
      reportCount: row.report_count,
    };
  }
  return map;
}

export async function getCombinedCrowdLevels() {
  const [reported, interest] = await Promise.all([getAllCrowdLevels(), getInterestCounts()]);
  const ids = new Set([...Object.keys(reported), ...Object.keys(interest)]);
  const combined = {};

  for (const id of ids) {
    const r = reported[id];
    const interestedCount = interest[id] || 0;

    // Self-reports are direct human observation, so they win when present.
    // With no reports yet, fall back to interest count as a rough estimate.
    let level = r ? r.level : null;
    if (!level && interestedCount >= 15) level = 3;
    else if (!level && interestedCount >= 6) level = 2;
    else if (!level && interestedCount > 0) level = 1;

    combined[id] = {
      level,
      label: level ? { 1: 'Low', 2: 'Medium', 3: 'High' }[level] : 'No data yet',
      reportCount: r?.reportCount || 0,
      interestedCount,
    };
  }
  return combined;
}

/** Same as getCombinedCrowdLevels(), but keyed by name instead of id —
 * for the chatbot, which only knows mandal names. */
export async function getCombinedCrowdLevelsByName() {
  const [combined, ganpatis] = await Promise.all([getCombinedCrowdLevels(), getAllGanpatis()]);
  return ganpatis
    .map((g) => ({ name: g.name, ...(combined[g.id] || { level: null, label: 'No data yet' }) }))
    .filter((g) => g.level !== null);
}

//////

const INTEREST_WINDOW_MINUTES = 60;

/** Record that some anonymous session currently has this Ganpati in their route. */
export async function pingInterest(ganpatiId, sessionId) {
  await query(
    `INSERT INTO route_interest (ganpati_id, session_id) VALUES ($1, $2)`,
    [ganpatiId, sessionId]
  );
}

/** Distinct sessions interested in each Ganpati in the last hour. */
export async function getInterestCounts() {
  const { rows } = await query(
    `SELECT ganpati_id, COUNT(DISTINCT session_id)::int AS interested_count
     FROM route_interest
     WHERE pinged_at > NOW() - INTERVAL '${INTEREST_WINDOW_MINUTES} minutes'
     GROUP BY ganpati_id`
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
       AND pinged_at > NOW() - INTERVAL '${INTEREST_WINDOW_MINUTES} minutes'`,
    [ganpatiId]
  );
  return rows[0]?.interested_count || 0;
}