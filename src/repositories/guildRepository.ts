import { container } from '@sapphire/pieces'

import { TIME } from '~/constants/timeConstant'

export class GuildRepository {
  public static async invalidateCache(guildId: string) {
    await container.redis.del(`guild:${guildId}`)
  }

  public static async getGuild(guildId: string) {
    return container.prisma.guild.findUnique({
      where: { guildId }
    })
  }

  public static async getOrCreate(guildId: string) {
    return container.prisma.guild.upsert({
      where: { guildId },
      create: { guildId },
      update: {}
    })
  }

  public static async getGuildCached(guildId: string) {
    const cacheKey = `guild:${guildId}`
    const cached = await container.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const guild = await this.getGuild(guildId)
    if (guild) {
      await container.redis.set(cacheKey, JSON.stringify(guild), 'EX', TIME.M5 / 1000)
    }
    return guild
  }

  public static async updateConfig(
    guildId: string,
    data: {
      serviceForumChannelId?: string
      notificationForumChannelId?: string
      ticketCategoryId?: string
      ticketTutorialThreadId?: string
      ticketNotificationThreadId?: string
      confessionForumChannelId?: string
      confessionTutorialThreadId?: string
      confessionNotificationThreadId?: string
      donationTutorialThreadId?: string
      donationNotificationThreadId?: string
      errorNotificationThreadId?: string
    }
  ) {
    await this.getOrCreate(guildId)
    const guild = await container.prisma.guild.update({
      where: { guildId },
      data
    })
    await this.invalidateCache(guildId)
    return guild
  }

  public static async getTicketConfig(guildId: string) {
    const guild = await this.getGuildCached(guildId)
    return guild
      ? {
          ticketCategoryId: guild.ticketCategoryId,
          ticketTutorialThreadId: guild.ticketTutorialThreadId,
          ticketNotificationThreadId: guild.ticketNotificationThreadId,
          notificationForumChannelId: guild.notificationForumChannelId
        }
      : null
  }

  public static async getConfessionConfig(guildId: string) {
    const guild = await this.getGuildCached(guildId)
    if (!guild) return null
    return {
      notificationForumChannelId: guild.notificationForumChannelId,
      forumChannelId: guild.confessionForumChannelId,
      confessionTutorialThreadId: guild.confessionTutorialThreadId,
      confessionNotificationThreadId: guild.confessionNotificationThreadId
    }
  }

  public static async getDonationConfig(guildId: string) {
    const guild = await this.getGuildCached(guildId)
    return guild
      ? {
          donationTutorialThreadId: guild.donationTutorialThreadId,
          donationNotificationThreadId: guild.donationNotificationThreadId
        }
      : null
  }
}
