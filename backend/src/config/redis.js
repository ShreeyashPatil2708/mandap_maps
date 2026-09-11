import Redis from 'ioredis';

let client;

/**
 * Shared Redis client (on-box Redis on each API instance, so keys are
 * per-instance). Ganpati reads are served from here with a 24h TTL, falling
 * back to RDS on a cache miss.
 */
export function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      // Bound every Redis call so an outage degrades to direct DB reads within
      // a fraction of a second instead of stalling each request.
      connectTimeout: 2_000,
      commandTimeout: 500,
    });
    client.on('error', (err) => {
      console.error('Redis error', err);
    });
  }
  return client;
}

/**
 * Atomically claim a per-instance cooldown slot. Returns false if `key` is
 * still cooling down, true otherwise (and starts a new `seconds` cooldown).
 * Fails open (true) when Redis is unavailable so a Redis blip never blocks
 * legitimate writes; the per-IP rate limit still applies.
 *
 * Redis is on each box, so this is per instance: use it only where that's
 * harmless (location pings). Cooldowns that protect crowd levels use
 * claimSharedCooldown in repositories/limitsRepo.js.
 */
export async function claimCooldown(key, seconds) {
  try {
    return (await getRedis().set(key, '1', 'EX', seconds, 'NX')) === 'OK';
  } catch {
    return true;
  }
}

/** TTL (seconds) for cached ganpati data. Defaults to 24 hours. */
export function cacheTtl() {
  return Number(process.env.GANPATI_CACHE_TTL) || 86400;
}

export async function closeRedis() {
  if (client) {
    await client.quit();
    client = undefined;
  }
}
