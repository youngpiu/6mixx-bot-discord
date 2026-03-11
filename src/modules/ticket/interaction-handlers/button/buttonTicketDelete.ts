import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonTicketDelete extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.BTN_TICKET_DELETE_PREFIX))
      return this.none()

    if (!interaction.memberPermissions?.has('Administrator')) return this.none()

    const ticketId = interaction.customId.split(':')[1]
    if (!ticketId) return this.none()

    return this.some({ ticketId })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return

    await interaction.deferReply({ flags: 'Ephemeral' })

    const { ticketId } = result

    const ticket = await TicketRepository.findById(ticketId)

    if (!ticket) {
      await InteractionUtil.replyError(
        interaction,
        'Không tìm thấy phiếu hỗ trợ này.'
      )
      return
    }

    await TicketRepository.delete(ticketId)

    await InteractionUtil.replySuccess(
      interaction,
      `Đã xoá thành công phiếu hỗ trợ \`#${ticket.code}\` thành công.`
    )
  }
}
