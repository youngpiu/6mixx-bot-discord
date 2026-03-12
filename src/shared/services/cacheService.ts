import { container } from '@sapphire/pieces'

export class CacheService {
  /**
   * Cache-aside / remember pattern.
   * Returns cached value if present, otherwise runs the fetcher, stores result and returns it.
   *
   * @param key   Redis cache key
   * @param ttlMs TTL in milliseconds
   * @param fetcher Async function that fetches data from DB if cache miss
   */
  public static async remember<T>(
    key: string,
    ttlMs: number | undefined,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await container.redis.get(key)
    if (cached) return JSON.parse(cached) as T

    const result = await fetcher()
    await this.set(key, result, ttlMs ? Math.floor(ttlMs / 1000) : undefined)
    return result
  }

  /**
   * Get a value from cache.
   */
  public static async get<T>(key: string): Promise<T | null> {
    const cached = await container.redis.get(key)
    if (!cached) return null
    return JSON.parse(cached) as T
  }

  /**
   * Set a value in cache with optional TTL.
   */
  public static async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    const raw = JSON.stringify(value)
    if (ttlSeconds) {
      await container.redis.set(key, raw, 'EX', ttlSeconds)
    } else {
      await container.redis.set(key, raw)
    }
  }

  /**
   * Invalidate a single cache key.
   */
  public static async delete(key: string): Promise<void> {
    await container.redis.del(key)
  }

  /**
   * Invalidate a single cache key. (Alias for delete)
   */
  public static async invalidate(key: string): Promise<void> {
    await this.delete(key)
  }

  /**
   * Invalidate all cache keys matching a glob pattern.
   * Uses SCAN instead of KEYS to avoid blocking the Redis server.
   *
   * @param pattern Glob pattern, e.g. "tickets:guild123:*"
   */
  public static async invalidatePattern(pattern: string): Promise<void> {
    const keys: string[] = []
    let cursor = '0'

    do {
      const [nextCursor, batch] = await container.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      )
      cursor = nextCursor
      keys.push(...batch)
    } while (cursor !== '0')

    if (keys.length > 0) {
      await container.redis.del(...keys)
    }
  }

  // ─── Redis Set Operations ───────────────────────────────────────────

  /**
   * Add one or more members to a set.
   */
  public static async sadd(key: string, ...members: string[]): Promise<number> {
    return container.redis.sadd(key, ...members)
  }

  /**
   * Check if a member exists in a set.
   */
  public static async sismember(key: string, member: string): Promise<boolean> {
    const result = await container.redis.sismember(key, member)
    return result === 1
  }

  /**
   * Get the number of members in a set.
   */
  public static async scard(key: string): Promise<number> {
    return container.redis.scard(key)
  }

  /**
   * Get a random member from a set.
   */
  public static async srandmember(key: string): Promise<string | null> {
    return container.redis.srandmember(key)
  }

  /**
   * Create a Redis pipeline for batch operations.
   */
  public static pipeline() {
    return container.redis.pipeline()
  }
}
