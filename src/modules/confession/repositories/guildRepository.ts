// Repository for confession-related guild configuration
import { SettingRepository } from '~/shared/repositories/settingRepository'

export class GuildRepository {
  public static async getConfig(guildId: string) {
    const setting = await SettingRepository.find(guildId)
    if (!setting) return null
    return {
      notificationForumChannelId: setting.notificationForumChannelId,
      forumChannelId: setting.confessionForumChannelId,
      confessionTutorialThreadId: setting.confessionTutorialThreadId,
      confessionNotificationThreadId: setting.confessionNotificationThreadId
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
    return SettingRepository.update(guildId, data)
  }
}
