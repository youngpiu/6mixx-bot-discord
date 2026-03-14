import { container } from '@sapphire/pieces'

/**
 * A central service for managing Redis-based caching operations.
 * Provides wrappers for common Redis commands and implement patterns like 'remember' (cache-aside).
 */
export class CacheService {
  /**
   * Implements the Cache-aside (remember) pattern.
   * Returns a cached value if it exists; otherwise, executes the provided fetcher function,
   * stores the result in Redis with the specified TTL, and returns the result.
   *
   * @template T - The type of data being cached.
   * @param key - The unique Redis key for the cache entry.
   * @param ttlMs - Time-to-live in milliseconds. If undefined, the cache will not expire.
   * @param fetcher - An asynchronous function that retrieves the source data (e.g., from a database).
   * @returns The cached or freshly fetched value.
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
   * Retrieves a value from the cache and parses it from JSON.
   *
   * @template T - The expected type of the cached value.
   * @param key - The Redis key to retrieve.
   * @returns The parsed value if found, otherwise null.
   */
  public static async get<T>(key: string): Promise<T | null> {
    const cached = await container.redis.get(key)
    if (!cached) return null
    return JSON.parse(cached) as T
  }

  /**
   * Serializes a value to JSON and stores it in the cache with an optional expiration.
   *
   * @template T - The type of value being stored.
   * @param key - The Redis key to store the value under.
   * @param value - The value to cache.
   * @param ttlSeconds - Optional time-to-live in seconds.
   * @returns A promise that resolves when the operation is complete.
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
   * Retrieves a raw string from the cache.
   *
   * @param key - The Redis key to retrieve.
   * @returns The raw string if found, otherwise null.
   */
  public static async getRaw(key: string): Promise<string | null> {
    return container.redis.get(key)
  }

  /**
   * Stores a raw string in the cache.
   *
   * @param key - The Redis key to store the value under.
   * @param value - The string to cache.
   * @param ttlSeconds - Optional time-to-live in seconds.
   */
  public static async setRaw(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<void> {
    if (ttlSeconds) {
      await container.redis.set(key, value, 'EX', ttlSeconds)
    } else {
      await container.redis.set(key, value)
    }
  }

  /**
   * Removes a single key from the cache.
   *
   * @param key - The Redis key to delete.
   */
  public static async delete(key: string): Promise<void> {
    await container.redis.del(key)
  }

  /**
   * An alias for the `delete` method to invalidate a single cache key.
   *
   * @param key - The Redis key to invalidate.
   */
  public static async invalidate(key: string): Promise<void> {
    await this.delete(key)
  }

  /**
   * Invalidates multiple cache keys that match a specific glob pattern.
   * This method uses the `SCAN` command to avoid blocking the Redis event loop.
   *
   * @example
   * ```ts
   * await CacheService.invalidatePattern("tickets:guild-123:*");
   * ```
   *
   * @param pattern - The glob pattern to match keys against (e.g., "prefix:*").
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
   * Adds one or more members to a Redis set.
   *
   * @param key - The Redis key for the set.
   * @param members - One or more strings to add to the set.
   * @returns The number of elements that were added to the set.
   */
  public static async sadd(key: string, ...members: string[]): Promise<number> {
    return container.redis.sadd(key, ...members)
  }

  /**
   * Determines if a given value is a member of a Redis set.
   *
   * @param key - The Redis key for the set.
   * @param member - The value to check for membership.
   * @returns True if the value is in the set, false otherwise.
   */
  public static async sismember(key: string, member: string): Promise<boolean> {
    const result = await container.redis.sismember(key, member)
    return result === 1
  }

  /**
   * Returns the set cardinality (number of elements) of the set stored at key.
   *
   * @param key - The Redis key for the set.
   * @returns The number of members in the set.
   */
  public static async scard(key: string): Promise<number> {
    return container.redis.scard(key)
  }

  /**
   * Returns a random member from the set stored at key.
   *
   * @param key - The Redis key for the set.
   * @returns A random member from the set, or null if the set is empty.
   */
  public static async srandmember(key: string): Promise<string | null> {
    return container.redis.srandmember(key)
  }

  /**
   * Creates a Redis pipeline for executing multiple commands in a single atomic-like batch.
   *
   * @returns A Redis pipeline instance.
   */
  public static pipeline() {
    return container.redis.pipeline()
  }
}
