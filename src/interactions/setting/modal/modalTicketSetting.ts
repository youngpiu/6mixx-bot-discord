import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

import { InteractionUtil } from '~/utils/messageUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ModalTicketSetting extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_TICKET_GENERAL_SETTING) return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction || !interaction.guild) return

    const ticketCategoryId = interaction.fields
      .getSelectedChannels('select-ticket-category')
      ?.first()?.id

    await GuildRepository.updateConfig(interaction.guild.id, {
      ticketCategoryId
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Bạn đã cập nhật thành công danh mục trong **Cài đặt hỗ trợ**.',
      lines(
        `- **Danh mục kênh hỗ trợ:** ${ticketCategoryId ? `<#${ticketCategoryId}>` : '*Chưa thiết lập*'}`
      )
    )
  }
}
