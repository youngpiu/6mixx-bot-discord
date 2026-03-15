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
export class ModalGalleryPostCollection extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_COLLECTION) {
      return this.some()
    }
    return this.none()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const members = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP
    )
    const thumbnailCollection = interaction.fields.getUploadedFiles(
      CUSTOM_ID.INPUT_NMIXX_COLLECTION_THUMBNAIL
    )
    const thumbnail = thumbnailCollection?.first()

    if (!thumbnail) {
      throw new NormalError('Bạn cần upload ít nhất một ảnh làm thumbnail.')
    }

    const thread = await GalleryService.createCollection({
      guild: interaction.guild!,
      members,
      thumbnail
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Khởi tạo bộ sưu tập thành công trong kênh ${channelMention(thread.id)}.`
    )
  }
}
