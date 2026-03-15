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
export class ButtonGallerySetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_NMIXX_FORUM)
      return this.none()
    const guildConfig = interaction.guild
      ? await SettingRepository.find(interaction.guild.id)
      : null
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!interaction.guild) return

    const { guildConfig } = result
    const labelSingleForum = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.nmixxSingleForumChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_NMIXX_SINGLE_FORUM,
      channelType: ChannelType.GuildForum,
      label: 'Kênh đăng ảnh một thành viên',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh đăng ảnh một thành viên',
        channelConfiguredButDeleted:
          'Kênh đăng ảnh một thành viên đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh đăng ảnh một thành viên',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const labelOtpForum = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.nmixxOtpForumChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_NMIXX_OTP_FORUM,
      channelType: ChannelType.GuildForum,
      label: 'Kênh đăng ảnh OTP',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh đăng ảnh OTP',
        channelConfiguredButDeleted:
          'Kênh đăng ảnh OTP đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh đăng ảnh OTP',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_NMIXX_FORUM)
      .setTitle('Cài đặt các kênh đăng ảnh NMIXX')
      .addLabelComponents(labelSingleForum, labelOtpForum)

    await interaction.showModal(modal)
  }
}
