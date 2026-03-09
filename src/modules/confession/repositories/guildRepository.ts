// Repository for confession-related guild configuration
import { GuildRepository as SharedGuildRepository } from '~/shared/repositories/guildRepository'

export class GuildRepository {
  public static async getConfig(guildId: string) {
    const guild = await SharedGuildRepository.findCached(guildId)
    if (!guild) return null
    return {
      notificationForumChannelId: guild.notificationForumChannelId,
      forumChannelId: guild.confessionForumChannelId,
      confessionTutorialThreadId: guild.confessionTutorialThreadId,
      confessionNotificationThreadId: guild.confessionNotificationThreadId
    }
  }

  public static async update({
    guildId,
    data
  }: {
    guildId: string
    data: {
      notificationForumChannelId?: string
      confessionForumChannelId?: string
      confessionTutorialThreadId?: string
      confessionNotificationThreadId?: string
    }
  }) {
    return SharedGuildRepository.update(guildId, data)
  }
}
