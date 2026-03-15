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
      interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_OTP
    ) {
      return this.some({
        isOtp: interaction.customId === CUSTOM_ID.MODAL_NMIXX_POST_OTP
      })
    }
    return this.none()
  }

  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { isOtp } = result

    await interaction.deferReply({ flags: ['Ephemeral'] })

    const url = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_NMIXX_TWEET_URL
    )
    const members = interaction.fields.getStringSelectValues(
      isOtp
        ? CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP
        : CUSTOM_ID.SELECT_NMIXX_MEMBER_SINGLE
    )

    const thread = await NmixxForumService.postToForum({
      guild: interaction.guild!,
      url,
      members,
      isOtp
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Đăng ảnh thành công vào kênh ${channelMention(thread.id)}.`
    )
  }
}
