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
export class ModalVoiceSettingTemp extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_TEMPVOICE_CHANNEL)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const tempVoiceCreateChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_TEMPVOICE_CREATE_CHANNEL)
      ?.first()?.id

    const tempVoiceCategoryId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_TEMPVOICE_CATEGORY)
      ?.first()?.id

    await SettingRepository.update(interaction.guild!.id, {
      tempVoiceCreateChannelId,
      tempVoiceCategoryId: tempVoiceCategoryId || null
    })

    const formattedFields = formatFields([
      [
        'Kênh tạo phòng tạm',
        tempVoiceCreateChannelId
          ? channelMention(tempVoiceCreateChannelId)
          : 'Không có'
      ],
      [
        'Danh mục phòng tạm',
        tempVoiceCategoryId ? channelMention(tempVoiceCategoryId) : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật cấu hình temp voice thành công.',
      formattedFields
    )
  }
}
