import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { MessageUtil } from '~/shared/utils/messageUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalConfessionComment extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.MODAL_COMMENT_PREFIX)) {
      return this.none()
    }

    const targetMessageId = interaction.customId.slice(
      CUSTOM_ID.MODAL_COMMENT_PREFIX.length
    )
    return this.some({ targetMessageId })
  }

  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return

    const { targetMessageId } = result
    const content = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_CONTENT
    )

    await interaction.deferUpdate()

    const channel = interaction.channel
    if (!channel || !channel.isTextBased()) {
      throw new NormalError('Không tìm thấy kênh để thực hiện phản hồi.')
    }

    if (targetMessageId) {
      const targetMessage = await channel.messages.fetch(targetMessageId)

      if (!targetMessage) {
        throw new NormalError('Không tìm thấy tin nhắn được chọn.')
      }

      if (targetMessage.author.bot) {
        await MessageUtil.sendToChannel(channel, { content })
      } else {
        await MessageUtil.reply(targetMessage, { content })
      }
    } else {
      await MessageUtil.sendToChannel(channel, { content })
    }
  }
}
