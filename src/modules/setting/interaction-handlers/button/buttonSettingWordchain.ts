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
export class ButtonSettingVietnameseWordChain extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL)
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

    const labelVietnameseWordChain = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.wordChainChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL,
      channelType: ChannelType.GuildText,
      label: 'Kênh nối từ tiếng Việt',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh nối từ',
        channelConfiguredButDeleted:
          'Kênh nối từ đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh nối từ',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL)
      .setTitle('Cài đặt kênh nối từ')
      .addLabelComponents(labelVietnameseWordChain)

    await interaction.showModal(modal)
  }
}
