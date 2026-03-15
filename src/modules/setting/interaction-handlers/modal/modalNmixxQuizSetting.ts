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
export class ModalNmixxQuizSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_NMIXX_QUIZ)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const nmixxQuizAnswerChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_NMIXX_QUIZ_ANSWER_CHANNEL)
      ?.first()?.id

    const nmixxQuizVoiceChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_NMIXX_QUIZ_VOICE_CHANNEL)
      ?.first()?.id

    await SettingRepository.update(interaction.guild!.id, {
      nmixxQuizAnswerChannelId,
      nmixxQuizVoiceChannelId
    })

    const formattedFields = formatFields([
      [
        'Kênh text đoán bài',
        nmixxQuizAnswerChannelId
          ? channelMention(nmixxQuizAnswerChannelId)
          : 'Không có'
      ],
      [
        'Kênh voice kích hoạt',
        nmixxQuizVoiceChannelId
          ? channelMention(nmixxQuizVoiceChannelId)
          : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật cấu hình kênh Music Quiz thành công.',
      formattedFields
    )
  }
}
