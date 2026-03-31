import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction, ChannelType, ModalBuilder } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { SettingHelper } from '~/modules/setting/helpers/SettingHelper'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonYouTubeNotificationSetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.BTN_SETTING_SNS_NOTIFICATION_CHANNELS
    )
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelListenChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.snsYouTubeListenChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_SNS_YOUTUBE_LISTEN_CHANNEL,
      channelType: ChannelType.GuildText,
      label: 'Kênh nhận link youtube',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh nhận link youtube',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh nhận link youtube',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const labelPostChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.snsYouTubePostChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_SNS_YOUTUBE_POST_CHANNEL,
      channelType: ChannelType.GuildAnnouncement,
      label: 'Kênh phát thông báo youtube',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh phát thông báo youtube',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh phát thông báo youtube',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const labelTwitterPostChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.snsTwitterPostChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_SNS_TWITTER_POST_CHANNEL,
      channelType: ChannelType.GuildAnnouncement,
      label: 'Kênh phát thông báo twitter',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh phát thông báo twitter',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh phát thông báo twitter',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const labelInstagramPostChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.snsInstagramPostChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_SNS_INSTAGRAM_POST_CHANNEL,
      channelType: ChannelType.GuildAnnouncement,
      label: 'Kênh phát thông báo instagram',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh phát thông báo instagram',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh phát thông báo instagram',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_SNS_NOTIFICATION_CHANNELS)
      .setTitle('Cài đặt kênh thông báo SNS')
      .addLabelComponents(
        labelListenChannel,
        labelPostChannel,
        labelTwitterPostChannel,
        labelInstagramPostChannel
      )

    await interaction.showModal(modal)
  }
}
