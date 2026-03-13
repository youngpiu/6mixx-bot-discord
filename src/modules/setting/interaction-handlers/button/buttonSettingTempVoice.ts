import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
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
export class ButtonSettingTempVoice extends InteractionHandler {
  @RequiresGuildContext()
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_TEMPVOICE_CHANNEL)
      return this.none()
    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  @RequiresGuildContext()
  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelCreateChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.tempVoiceCreateChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_TEMPVOICE_CREATE_CHANNEL,
      channelType: ChannelType.GuildVoice,
      label: 'Kênh tạo phòng tạm',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh tạo phòng tạm',
        channelConfiguredButDeleted:
          'Kênh tạo phòng tạm đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh tạo phòng tạm',
        noChannelsInServer: 'Không có phòng thoại nào'
      }
    })

    const labelCategory = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.tempVoiceCategoryId,
      customId: CUSTOM_ID.SELECT_SETTING_TEMPVOICE_CATEGORY,
      channelType: ChannelType.GuildCategory,
      label: 'Danh mục phòng tạm (tuỳ chọn)',
      required: false,
      placeholders: {
        channelConfiguredAndExists: 'Chọn danh mục phòng tạm',
        channelConfiguredButDeleted:
          'Danh mục phòng tạm đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Không thiết lập danh mục phòng tạm',
        noChannelsInServer: 'Không có danh mục nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_TEMPVOICE_CHANNEL)
      .setTitle('Cài đặt phòng thoại tạm thời')
      .addLabelComponents(labelCreateChannel, labelCategory)

    await interaction.showModal(modal)
  }
}
