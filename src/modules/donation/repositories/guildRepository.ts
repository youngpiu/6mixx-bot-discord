import { SettingRepository } from '~/shared/repositories/settingRepository'

export class GuildRepository {
  public static async getConfig(guildId: string) {
    const setting = await SettingRepository.find(guildId)
    return setting
      ? {
          donationTutorialThreadId: setting.donationTutorialThreadId,
          donationNotificationThreadId: setting.donationNotificationThreadId
        }
      : null
  }
}
