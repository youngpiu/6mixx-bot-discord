import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, channelMention } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { formatFields } from '~/shared/utils/textUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalWordChainSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_WORDCHAIN_CHANNEL)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const vietnameseWordChainChannelId = interaction.fields
      .getSelectedChannels(
        CUSTOM_ID.SELECT_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL
      )
      ?.first()?.id

    const englishWordChainChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_ENGLISH_WORDCHAIN_CHANNEL)
      ?.first()?.id

    await SettingRepository.update(interaction.guild!.id, {
      vietnameseWordChainChannelId,
      englishWordChainChannelId
    })

    const formattedFields = formatFields([
      [
        'Kênh nối từ tiếng Việt',
        vietnameseWordChainChannelId
          ? channelMention(vietnameseWordChainChannelId)
          : 'Không có'
      ],
      [
        'Kênh nối từ tiếng Anh',
        englishWordChainChannelId
          ? channelMention(englishWordChainChannelId)
          : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật cấu hình kênh nối từ thành công.',
      formattedFields
    )
  }
}
