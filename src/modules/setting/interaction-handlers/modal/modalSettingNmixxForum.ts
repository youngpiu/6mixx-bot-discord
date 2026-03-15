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
export class ModalSettingNmixxForum extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_NMIXX_FORUM)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const nmixxSingleForumChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_NMIXX_SINGLE_FORUM)
      ?.first()?.id

    const nmixxOtpForumChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_NMIXX_OTP_FORUM)
      ?.first()?.id

    await SettingRepository.update(interaction.guild.id, {
      nmixxSingleForumChannelId,
      nmixxOtpForumChannelId
    })

    const formattedFields = formatFields([
      [
        'Kênh đăng ảnh một thành viên',
        nmixxSingleForumChannelId
          ? channelMention(nmixxSingleForumChannelId)
          : 'Không có'
      ],
      [
        'Kênh đăng ảnh OTP',
        nmixxOtpForumChannelId
          ? channelMention(nmixxOtpForumChannelId)
          : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật các kên đăng ảnh NMIXX thành công.',
      formattedFields
    )
  }
}
