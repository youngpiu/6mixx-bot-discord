import { container } from '@sapphire/pieces'

import type { GuildSettingUpdateInput } from 'generated/prisma/models/GuildSetting'

import { GuildRepository } from '~/shared/repositories/guildRepository'
import { CacheService } from '~/shared/services/cacheService'

const CACHE_KEY = (guildId: string) => `guild_setting:${guildId}`

export class SettingRepository {
  public static async find(guildId: string) {
    return CacheService.remember(CACHE_KEY(guildId), undefined, () =>
      container.prisma.guildSetting.findUnique({
        where: { guildId }
      })
    )
  }

  public static async upsert(guildId: string) {
    await GuildRepository.upsert(guildId)
    return container.prisma.guildSetting.upsert({
      where: { guildId },
      create: { guildId },
      update: {}
    })
  }

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
