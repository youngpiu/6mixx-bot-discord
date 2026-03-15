import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, channelMention } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { NmixxForumService } from '../../services/nmixxForumService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalNmixxPost extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_SINGLE ||
      interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_OTP ||
      interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_SINGLE_MANUAL ||
      interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_OTP_MANUAL
    ) {
      return this.some({
        isOtp:
          interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_OTP ||
          interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_OTP_MANUAL,
        isManual:
          interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_SINGLE_MANUAL ||
          interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_OTP_MANUAL
      })
    }
    return this.none()
  }

  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { isOtp, isManual } = result

    await interaction.deferReply({ flags: ['Ephemeral'] })

    const members = interaction.fields.getStringSelectValues(
      isOtp
        ? CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP
        : CUSTOM_ID.SELECT_NMIXX_MEMBER_SINGLE
    )

    let thread
    if (isManual) {
      const user = interaction.fields.getTextInputValue(
        CUSTOM_ID.INPUT_NMIXX_MANUAL_USER
      )
      const attachmentCollection = interaction.fields.getUploadedFiles(
        CUSTOM_ID.UPLOAD_NMIXX_MANUAL_MEDIA
      )
      const attachments = attachmentCollection ? Array.from(attachmentCollection.values()) : []

      thread = await NmixxForumService.postManualToForum({
        guild: interaction.guild!,
        user,
        attachments,
        members,
        isOtp
      })
    } else {
      const url = interaction.fields.getTextInputValue(
        CUSTOM_ID.INPUT_NMIXX_TWEET_URL
      )

      thread = await NmixxForumService.postToForum({
        guild: interaction.guild!,
        url,
        members,
        isOtp
      })
    }

    await InteractionUtil.replySuccess(
      interaction,
      `Đăng ảnh thành công vào kênh ${channelMention(thread.id)}.`
    )
  }
}
