import { container } from '@sapphire/pieces'

import type { GuildSettingUpdateInput } from 'generated/prisma/models/GuildSetting'

import { GuildRepository } from '~/shared/repositories/guildRepository'
import { CacheService } from '~/shared/services/cacheService'

const CACHE_KEY = (guildId: string) => `guild_setting:${guildId}`

/**
 * Repository for managing guild-specific settings with caching support.
 */
export class SettingRepository {
  /**
   * Retrieves the settings for a specific guild.
   * Leverages Redis caching for performance via the `CacheService.remember` pattern.
   *
   * @param guildId - The Discord Snowlake ID of the guild.
   * @returns A promise resolving to the guild settings or null if not found.
   */
  public static async find(guildId: string) {
    return CacheService.remember(CACHE_KEY(guildId), undefined, () =>
      container.prisma.guildSetting.findUnique({
        where: { guildId }
      })
    )
  }

  /**
   * Ensures the guild settings record exists.
   * Also ensures the parent Guild record exists via `GuildRepository.upsert`.
   *
   * @param guildId - The Discord Snowlake ID of the guild.
   * @returns A promise resolving to the upserted guild setting record.
   */
  public static async upsert(guildId: string) {
    await GuildRepository.upsert(guildId)
    return container.prisma.guildSetting.upsert({
      where: { guildId },
      create: { guildId },
      update: {}
    })
  }

  /**
   * Updates settings for a specific guild and invalidates the cached settings.
   *
   * @param guildId - The Discord Snowlake ID of the guild.
   * @param data - The partial settings data to update.
   * @returns A promise resolving to the updated guild setting record.
   */
  public static async update(guildId: string, data: GuildSettingUpdateInput) {
    await this.upsert(guildId)
    const setting = await container.prisma.guildSetting.update({
      where: { guildId },
      data
    })
    await CacheService.invalidate(CACHE_KEY(guildId))
    return setting
  }
}
