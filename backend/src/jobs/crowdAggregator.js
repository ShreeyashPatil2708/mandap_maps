import { query } from '../config/db.js';
import { purgeOldInterest } from '../repositories/crowdRepo.js';
import { purgeExpiredLimits } from '../repositories/limitsRepo.js';

const JOB_NAME = 'crowd-aggregation';
// Slightly under the 2 minute schedule, so a normal tick always wins its window
// while a second API instance ticking a few seconds later does not.
const MIN_SECONDS_BETWEEN_RUNS = 100;

/**
 * Atomically claim this run window. Every API instance runs the same timer, so
 * without this each instance would repeat the same work. Returns true for
 * exactly one caller per window.
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
 * Housekeeping tick.
 *
 * This job used to turn opted-in location pings into a live crowd estimate per
 * mandal. The frontend no longer shares location, so that half produced nothing
 * but still let the UI claim a level "estimated from live locations"; it is
 * gone, along with the interest signal it sat beside. Crowd levels now come
 * only from people tapping Low/Medium/High.
 *
 * What is left still has to run: purgeExpiredLimits keeps the shared report
 * cooldown table from growing without bound, and purgeOldInterest drains the
 * anonymous session ids written before the interest signal was removed.
 */
export async function runCrowdAggregation() {
  if (!(await claimRun())) return;
  await Promise.all([purgeOldInterest(), purgeExpiredLimits()]);
}
