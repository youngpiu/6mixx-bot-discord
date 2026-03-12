// Handler for confession modal submission
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { ConfessionHelper } from '~/modules/confession/helpers/ConfessionHelper'
import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalConfession extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.MODAL_CONFESSION_ANONYMOUS &&
      interaction.customId !== CUSTOM_ID.MODAL_CONFESSION_NAMED
    ) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) return

    const isAnonymous =
      interaction.customId === CUSTOM_ID.MODAL_CONFESSION_ANONYMOUS

    // Extract data using V2 API
    const content = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_CONTENT
    )

    const confession = await ConfessionRepository.create({
      guildId: interaction.guild.id,
      authorId: interaction.user.id,
      content,
      isAnonymous
    })

    await ConfessionHelper.sendConfessionLog({
      guildId: interaction.guild.id,
      confession: {
        code: confession.code,
        content,
        isAnonymous,
        authorId: interaction.user.id,
        createdAt: confession.createdAt
      },
      event: 'SUBMITTED'
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Đã gửi confession thành công, vui lòng đợi **Ban quản lý** xét duyệt.'
    )
  }
}
