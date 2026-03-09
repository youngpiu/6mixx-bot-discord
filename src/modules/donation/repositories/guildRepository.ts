import { GuildRepository as SharedGuildRepository } from '~/shared/repositories/guildRepository'

export class GuildRepository {
  public static async getConfig(guildId: string) {
    const guild = await SharedGuildRepository.findCached(guildId)
    return guild
      ? {
          donationTutorialThreadId: guild.donationTutorialThreadId,
          donationNotificationThreadId: guild.donationNotificationThreadId
        }
      : null
  }
}
