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

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    if (!interaction.guildId) throw new GuildOnlyError()

    const channels = interaction.fields.getSelectedChannels('select-ticket-category')
    const categoryChannel = channels?.first()
    const categoryId = categoryChannel?.id

    if (categoryId) {
      await GuildRepository.updateConfig(interaction.guildId, {
        ticketCategoryId: categoryId
      })

      await interaction.reply({
        embeds: [
          createSuccessEmbed({
            title: 'Thiết lập thành công',
            description: `Danh mục chứa kênh hỗ trợ: <#${categoryId}>`
          })
        ],
        flags: ['Ephemeral']
      })
    } else {
      await interaction.reply({
        embeds: [
          createSuccessEmbed({
            title: 'Thiết lập thành công',
            description: 'Không có thay đổi nào được lưu.'
          })
        ],
        flags: ['Ephemeral']
      })
    }

    await deleteReplyInteraction(interaction)
  })
}
