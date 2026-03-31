import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, channelMention } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { GalleryService } from '~/modules/gallery/services/galleryService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalGalleryPostX extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_X) {
      return this.some()
    }
    return this.none()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const members = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP
    )
    const url = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_NMIXX_TWEET_URL
    )

    const thread = await GalleryService.postToForum({
      guild: interaction.guild!,
      url,
      members
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Đăng ảnh thành công vào kênh ${channelMention(thread.id)}.`
    )
  }
}
