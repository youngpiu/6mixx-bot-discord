import { CacheService } from '~/shared/services/cacheService'

/**
 * Service for caching temporary voice channel data using Redis.
 * Handles profiles, trusted members, and trusted roles.
 */
export class TempVoiceCacheService {
  private static readonly TTL_MS = 1000 * 60 * 60 // 1 hour

  // --- Profile Keys ---
  private static getChannelLockKey(channelId: string) {
    return `voice:profile:channel:${channelId}`
  }

  private static getProfileOwnerKey(guildId: string, ownerId: string) {
    return `voice:profile:owner:${guildId}:${ownerId}`
  }

  // --- Trust Keys ---
  private static getTrustedMembersKey(guildId: string, ownerId: string) {
    return `voice:trusted:members:${guildId}:${ownerId}`
  }

  private static getTrustedRolesKey(guildId: string, ownerId: string) {
    return `voice:trusted:roles:${guildId}:${ownerId}`
  }

  // ==========================================
  // READ (Remember)
  // ==========================================

  /**
   * Caches or retrieves a temporary voice profile by channel ID.
   * @template T
   * @param channelId The ID of the voice channel.
   * @param fetcher Function to fetch data if not in cache.
   * @returns The cached or fetched profile data.
   */
  public static async rememberChannelProfile<T>(
    channelId: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getChannelLockKey(channelId),
      this.TTL_MS,
      fetcher
    )
  }

  /**
   * Caches or retrieves a temporary voice profile by guild and owner ID.
   * @template T
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param fetcher Function to fetch data if not in cache.
   * @returns The cached or fetched profile data.
   */
  public static async rememberOwnerProfile<T>(
    guildId: string,
    ownerId: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getProfileOwnerKey(guildId, ownerId),
      this.TTL_MS,
      fetcher
    )
  }

  /**
   * Caches or retrieves a list of trusted members for an owner.
   * @template T
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param fetcher Function to fetch data if not in cache.
   * @returns The cached or fetched trusted members list.
   */
  public static async rememberTrustedMembers<T>(
    guildId: string,
    ownerId: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getTrustedMembersKey(guildId, ownerId),
      this.TTL_MS,
      fetcher
    )
  }

  /**
   * Caches or retrieves a list of trusted roles for an owner.
   * @template T
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param fetcher Function to fetch data if not in cache.
   * @returns The cached or fetched trusted roles list.
   */
  public static async rememberTrustedRoles<T>(
    guildId: string,
    ownerId: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getTrustedRolesKey(guildId, ownerId),
      this.TTL_MS,
      fetcher
    )
  }

  // ==========================================
  // INVALIDATE
  // ==========================================

  /**
   * Invalidates all cache entries related to a temporary voice profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param [channelId] The ID of the voice channel (optional).
   */
  public static async invalidateProfileFull(
    guildId: string,
    ownerId: string,
    channelId?: string | null
  ) {
    const keys = [this.getProfileOwnerKey(guildId, ownerId)]
    if (channelId) {
      keys.push(this.getChannelLockKey(channelId))
    }
    await Promise.all(keys.map((k) => CacheService.invalidate(k)))
  }

  /**
   * Invalidates the cached trusted members list for an owner.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   */
  public static async invalidateTrustedMembers(
    guildId: string,
    ownerId: string
  ) {
    await CacheService.invalidate(this.getTrustedMembersKey(guildId, ownerId))
  }

  /**
   * Invalidates the cached trusted roles list for an owner.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   */
  public static async invalidateTrustedRoles(guildId: string, ownerId: string) {
    await CacheService.invalidate(this.getTrustedRolesKey(guildId, ownerId))
  }
}
