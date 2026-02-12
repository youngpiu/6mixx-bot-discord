import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ModalTicketSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== 'modal-ticket-general-setting') return this.none()
    return this.some()
  }

  // Handles the submission of the ticket setting modal
  // Updates the ticket category configuration
  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const channels = interaction.fields.getSelectedChannels('select-ticket-category')
    const categoryChannel = channels?.first()
    const categoryId = categoryChannel?.id

    if (categoryId) {
      await GuildRepository.updateConfig(interaction.guildId, {
        ticketCategoryId: categoryId
      })
    }

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Thiết lập thành công',
          description: categoryId
            ? `Danh mục chứa các kênh hỗ trợ đã được tạo: <#${categoryId}>`
            : 'Không có thay đổi nào được lưu.'
        })
      ]
    })

    await deleteReplyInteraction(interaction)
  })
}
