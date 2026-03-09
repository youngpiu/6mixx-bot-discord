// Shared repository for managing and caching guild-specific data
import { container } from '@sapphire/pieces'

import type { GuildUpdateInput } from 'generated/prisma/models/Guild'

import { TIME } from '~/shared/constants/timeConstant'

export class GuildRepository {
  private static async invalidateCache(guildId: string) {
    await container.redis.del(`guild:${guildId}`)
  }

  public static async findCached(guildId: string) {
    const cacheKey = `guild:${guildId}`
    const cached = await container.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const guild = await this.findUnique(guildId)
    if (guild) {
      await container.redis.set(
        cacheKey,
        JSON.stringify(guild),
        'EX',
        TIME.M5 / 1000
      )
    }
    return guild
  }

  public static async findUnique(guildId: string) {
    return container.prisma.guild.findUnique({
      where: { guildId }
    })
  }

  public static async upsert(guildId: string) {
    return container.prisma.guild.upsert({
      where: { guildId },
      create: { guildId },
      update: {}
    })
  }

  public static async update(guildId: string, data: GuildUpdateInput) {
    await this.upsert(guildId)
    const guild = await container.prisma.guild.update({
      where: { guildId },
      data
    })
    await this.invalidateCache(guildId)
    return guild
  }
}
