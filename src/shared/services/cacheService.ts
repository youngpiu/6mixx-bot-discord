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
    ttlMs: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await container.redis.get(key)
    if (cached) return JSON.parse(cached) as T

    const result = await fetcher()
    await container.redis.set(key, JSON.stringify(result), 'EX', Math.floor(ttlMs / 1000))
    return result
  }

  /**
   * Invalidate a single cache key.
   */
  public static async invalidate(key: string): Promise<void> {
    await container.redis.del(key)
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
}
