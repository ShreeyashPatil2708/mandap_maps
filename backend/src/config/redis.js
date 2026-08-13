import Redis from 'ioredis';

let client;

/**
 * Shared Redis (ElastiCache) client. All ganpati reads are served from here
 * with a 24h TTL, falling back to RDS on a cache miss (see architecture).
 */
export function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Redis error', err);
    });
  }
  return client;
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
