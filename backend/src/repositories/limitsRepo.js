import { query } from '../config/db.js';

// Cooldowns and rate limits shared by every API instance. Redis runs on each
// box (so its keys are per instance) and express-rate-limit's default store is
// in process memory, so with N instances behind the ALB a client would get N
// times every limit. Postgres is the one store all instances already share.
//
// One table serves both: a row is a counter for `key` that expires at reset_at.

/**
 * Atomically claim a cooldown slot shared across instances. Returns false if
 * `key` is still cooling down, true otherwise (and starts a new `seconds`
 * cooldown). Fails open (true) on a database error: the write that follows
 * would fail anyway, and a DB blip must not be reported as "please wait".
 */
export async function claimSharedCooldown(key, seconds) {
  try {
    const { rowCount } = await query(
      `INSERT INTO rate_counters (key, count, reset_at)
       VALUES ($1, 1, NOW() + make_interval(secs => $2))
       ON CONFLICT (key) DO UPDATE
         SET count = 1, reset_at = EXCLUDED.reset_at
         WHERE rate_counters.reset_at <= NOW()`,
      [`cooldown:${key}`, seconds]
    );
    return rowCount === 1;
  } catch {
    return true;
  }
}

/**
 * express-rate-limit Store backed by rate_counters, so a per-IP limit holds
 * across the whole fleet instead of per instance. One upsert per counted hit.
 */
export class PgRateLimitStore {
  constructor(prefix = 'rl') {
    this.prefix = prefix;
    this.localKeys = false;
  }

  init(options) {
    this.windowSeconds = options.windowMs / 1000;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(key) {
    const { rows } = await query(
      `INSERT INTO rate_counters (key, count, reset_at)
       VALUES ($1, 1, NOW() + make_interval(secs => $2))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_counters.reset_at <= NOW() THEN 1 ELSE rate_counters.count + 1 END,
         reset_at = CASE WHEN rate_counters.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE rate_counters.reset_at END
       RETURNING count, reset_at`,
      [this.key(key), this.windowSeconds]
    );
    return { totalHits: rows[0].count, resetTime: rows[0].reset_at };
  }

  async decrement(key) {
    await query(`UPDATE rate_counters SET count = GREATEST(count - 1, 0) WHERE key = $1`, [
      this.key(key),
    ]);
  }

  async resetKey(key) {
    await query(`DELETE FROM rate_counters WHERE key = $1`, [this.key(key)]);
  }
}

/** Housekeeping: drop counters that expired a while ago. */
export async function purgeExpiredLimits() {
  await query(`DELETE FROM rate_counters WHERE reset_at < NOW() - INTERVAL '10 minutes'`);
}
