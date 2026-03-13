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
export class ButtonSettingWordChain extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_WORDCHAIN_CHANNEL)
      return this.none()
    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelVietnameseWordChain = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.vietnameseWordChainChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL,
      channelType: ChannelType.GuildText,
      label: 'Kênh nối từ tiếng Việt',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh nối từ tiếng Việt',
        channelConfiguredButDeleted:
          'Kênh nối từ tiếng Việt đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh nối từ tiếng Việt',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const labelEnglishWordChain = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.englishWordChainChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_ENGLISH_WORDCHAIN_CHANNEL,
      channelType: ChannelType.GuildText,
      label: 'Kênh nối từ tiếng Anh',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh nối từ tiếng Anh',
        channelConfiguredButDeleted:
          'Kênh nối từ tiếng Anh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh nối từ tiếng Anh',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_WORDCHAIN_CHANNEL)
      .setTitle('Cài đặt kênh nối từ')
      .addLabelComponents(labelVietnameseWordChain, labelEnglishWordChain)

    await interaction.showModal(modal)
  }
}
