import { query } from '../config/db.js';
import { getAllGanpatis } from './ganpatiRepo.js';

// A mandal's crowd level comes from one thing and one thing only: people who
// were standing there tapped Low/Medium/High in the last WINDOW_MINUTES.
//
// It used to come from three signals, and the other two invented data:
//
//   - "interest" turned route planning into a crowd reading. One person saving
//     a mandal to their route painted its map pin green as though somebody had
//     looked at the queue; fifteen turned it red and put a "Busy now" badge on
//     it. Nobody had observed anything.
//   - "location" came from opted-in location pings, which the frontend stopped
//     sending, so the estimate table could only ever be empty while the UI was
//     still willing to say "estimated from live locations".
//
// With no reports there is no level, and the UI says so, which is the honest
// answer and the one it can defend.

// Only taps from the last WINDOW_MINUTES count. Older ones are stale.
const WINDOW_MINUTES = 45;

const LEVEL_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };
const NO_DATA_LABEL = 'No data yet';

/** How long a tap counts for, so the UI can say it without hardcoding it too. */
export const REPORT_WINDOW_MINUTES = WINDOW_MINUTES;

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

/** The public shape for one mandal's reports, or null when nobody has reported. */
function toCrowd(reported) {
  if (!reported?.reportCount) return null;
  return {
    level: reported.level,
    label: LEVEL_LABELS[reported.level],
    reportCount: reported.reportCount,
    windowMinutes: WINDOW_MINUTES,
  };
}

export const noCrowdData = () => ({
  level: null,
  label: NO_DATA_LABEL,
  reportCount: 0,
  windowMinutes: WINDOW_MINUTES,
});

/**
 * Current crowd level for one Ganpati. Returns null if nobody has reported, so
 * the UI can say "no reports yet" instead of showing a fake default.
 */
export async function getCrowdLevel(ganpatiId) {
  const reported = await getReportedLevels(ganpatiId);
  return toCrowd(reported[ganpatiId]);
}

/**
 * Crowd levels for every Ganpati that has one (paints the map in one call).
 * Mandals with no reports are left out entirely rather than sent as empty
 * placeholders, which the map used to render as "Name · No data yet".
 */
export async function getCombinedCrowdLevels() {
  const reported = await getReportedLevels();
  const combined = {};
  for (const [id, row] of Object.entries(reported)) {
    const crowd = toCrowd(row);
    if (crowd) combined[id] = crowd;
  }
  return combined;
}

/** Same as getCombinedCrowdLevels(), but keyed by name instead of id,
 * for the chatbot, which only knows mandal names. */
export async function getCombinedCrowdLevelsByName() {
  const [combined, ganpatis] = await Promise.all([getCombinedCrowdLevels(), getAllGanpatis()]);
  return ganpatis.filter((g) => combined[g.id]).map((g) => ({ name: g.name, ...combined[g.id] }));
}

/**
 * Housekeeping only. route_interest is no longer read, but rows written before
 * the interest signal was removed still carry anonymous session ids, so keep
 * draining the table until it is empty.
 */
export async function purgeOldInterest() {
  await query(`DELETE FROM route_interest WHERE pinged_at < NOW() - make_interval(mins => 120)`);
}
