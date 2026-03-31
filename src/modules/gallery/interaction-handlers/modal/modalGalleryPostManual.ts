import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, channelMention } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { GalleryService } from '~/modules/gallery/services/galleryService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalGalleryPostManual extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_MANUAL) {
      return this.some()
    }
    return this.none()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const members = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP
    )
    const user = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_NMIXX_MANUAL_USER
    )
    const dateStr = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_NMIXX_MANUAL_DATE
    )

    // Validate date format if provided
    if (dateStr && !/^\d{1,2}[./]\d{1,2}[./]\d{4}$/.test(dateStr)) {
      throw new NormalError(
        'Định dạng ngày không hợp lệ. Vui lòng dùng dd.mm.yyyy hoặc dd/mm/yyyy.'
      )
    }

    const attachmentCollection = interaction.fields.getUploadedFiles(
      CUSTOM_ID.UPLOAD_NMIXX_MANUAL_MEDIA
    )
    const attachments = attachmentCollection
      ? Array.from(attachmentCollection.values())
      : []

    const thread = await GalleryService.postManualToForum({
      guild: interaction.guild!,
      user,
      date: dateStr || undefined,
      attachments,
      members
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Đăng ảnh thành công vào kênh ${channelMention(thread.id)}.`
    )
  }
}
