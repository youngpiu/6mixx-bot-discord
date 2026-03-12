import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { ConfessionStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { ConfessionHelper } from '~/modules/confession/helpers/ConfessionHelper'
import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalConfessionReject extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId.startsWith(CUSTOM_ID.MODAL_CONFESSION_REJECT_PREFIX)
    ) {
      const confessionId = interaction.customId.slice(
        CUSTOM_ID.MODAL_CONFESSION_REJECT_PREFIX.length
      )
      return this.some({ confessionId })
    }
    return this.none()
  }

  @RequiresGuildContext()
  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { confessionId } = result

    await interaction.deferUpdate()

    const confession = await ConfessionRepository.findById(confessionId)

    if (!confession) {
      throw new NormalError('Không tìm thấy confession này.')
    }

    if (confession.status !== ConfessionStatus.PENDING) {
      throw new NormalError('Confession này đã được xét duyệt rồi.')
    }

    const reason = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_CONTENT)

    // Update Confession Status in Db
    await ConfessionRepository.update(confession.id, {
      status: ConfessionStatus.REJECTED,
      approvedBy: interaction.user.id,
      rejectionReason: reason
    })

    await ConfessionHelper.sendConfessionLog({
      guildId: interaction.guild!.id,
      confession: {
        code: confession.code,
        content: confession.content,
        isAnonymous: confession.isAnonymous,
        authorId: confession.authorId,
        createdAt: confession.createdAt
      },
      event: 'REJECTED',
      executorId: interaction.user.id
    })

    // Attempt DM the user if not anonymous
    if (!confession.isAnonymous && confession.authorId) {
      const dmContent = `Confession \`#${confession.code}\` của bạn vừa bị từ chối.\n**Lý do:** ${reason}`
      await InteractionUtil.sendDM(confession.authorId, dmContent)
    }

    await InteractionUtil.replySuccess(
      interaction,
      `Đã từ chối confession \`#${confession.code}\`.`
    )
  }
}
