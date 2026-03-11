// Handler for deleting a disbursement via the "Delete" button in the detail view
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDisbursementDelete extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (
      interaction.customId.startsWith(CUSTOM_ID.BTN_DISBURSEMENT_DELETE_PREFIX)
    ) {
      const id = interaction.customId.slice(
        CUSTOM_ID.BTN_DISBURSEMENT_DELETE_PREFIX.length
      )
      return this.some(id)
    }
    return this.none()
  }

  public async run(interaction: ButtonInteraction, id: string) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) return

    const disbursement = await DisbursementRepository.findById(id)
    if (!disbursement) {
      throw new NormalError('Không tìm thấy khoản chi này.')
    }

    await DisbursementRepository.delete(id)

    await InteractionUtil.replySuccess(
      interaction,
      `Đã xoá khoản chi thành công.`
    )
  }
}
