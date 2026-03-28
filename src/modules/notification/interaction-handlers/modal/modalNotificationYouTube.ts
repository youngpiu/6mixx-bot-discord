import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { YouTubeNotificationService } from '~/modules/notification/services/YouTubeNotificationService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalNotificationYouTubeHandler extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_YOUTUBE) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const url = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_YOUTUBE_URL
    )
    let overrideTitle: string | undefined = undefined
    try {
      overrideTitle =
        interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_YOUTUBE_TITLE) ||
        undefined
    } catch {
      // Optional field
    }

    const success = await YouTubeNotificationService.processAndNotify(
      interaction.guildId!,
      url,
      overrideTitle
    )

    if (success) {
      return InteractionUtil.replySuccess(
        interaction,
        'Đã gửi thông báo YouTube thành công!'
      )
    } else {
      return InteractionUtil.replyError(
        interaction,
        'Đã có lỗi xảy ra khi xử lý link YouTube. Vui lòng kiểm tra lại link hoặc cấu hình bot.'
      )
    }
  }
}
