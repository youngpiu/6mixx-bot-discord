// Repository for ticket-specific guild configuration
import { SettingRepository } from '~/shared/repositories/settingRepository'

export class GuildRepository {
  public static async getConfig(guildId: string) {
    const setting = await SettingRepository.find(guildId)
    return setting
      ? {
          ticketCategoryId: setting.ticketCategoryId,
          ticketTutorialThreadId: setting.ticketTutorialThreadId,
          ticketNotificationThreadId: setting.ticketNotificationThreadId,
          notificationForumChannelId: setting.notificationForumChannelId
        }
      : null
  }
}
