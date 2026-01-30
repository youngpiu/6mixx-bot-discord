import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { BadRequestError } from '~/core/errorResponse'

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
    if (interaction.customId !== 'modal-ticket-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    if (!interaction.guildId) return

    const channels = interaction.fields.getSelectedChannels('select-ticket-channel')

    const firstChannel = channels?.first()

    if (!firstChannel)
      throw new BadRequestError({ description: 'Kênh bạn chọn không tồn tại, vui lòng thử lại.' })

    const channelId = firstChannel.id

    await GuildRepository.updateTicketChannel(interaction.guildId, channelId)

    await interaction.reply({
      embeds: [
        createSuccessEmbed({
          title: 'Thiết lập thành công',
          description: `Kênh <#${channelId}> đã trở thành kênh tiếp nhận yêu cầu hỗ trợ.`
        })
      ],
      flags: ['Ephemeral']
    })

    await deleteReplyInteraction(interaction)
  })
}
