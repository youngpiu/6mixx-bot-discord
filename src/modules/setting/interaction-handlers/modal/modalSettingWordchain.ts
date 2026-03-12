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
export class ModalSettingVietnameseWordChain extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const wordChainChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_VIETNAMESE_WORDCHAIN_CHANNEL)
      ?.first()?.id

    await SettingRepository.update(interaction.guild.id, {
      wordChainChannelId
    })

    const formattedFields = formatFields([
      [
        'Kênh nối từ tiếng Việt',
        wordChainChannelId ? channelMention(wordChainChannelId) : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật cấu hình kênh nối từ thành công.',
      formattedFields
    )
  }
}
