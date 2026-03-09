// Repository for ticket-specific guild configuration
import { GuildRepository as SharedGuildRepository } from '~/shared/repositories/guildRepository'

export class GuildRepository {
  public static async getConfig(guildId: string) {
    const guild = await SharedGuildRepository.findCached(guildId)
    return guild
      ? {
          ticketCategoryId: guild.ticketCategoryId,
          ticketTutorialThreadId: guild.ticketTutorialThreadId,
          ticketNotificationThreadId: guild.ticketNotificationThreadId,
          notificationForumChannelId: guild.notificationForumChannelId
        }
      : null
  }
}
