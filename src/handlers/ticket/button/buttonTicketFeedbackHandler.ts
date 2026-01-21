import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ChannelType, EmbedBuilder, type ButtonInteraction, type TextChannel } from 'discord.js'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'
import { GuildRepository } from '~/repositories/guildRepository'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { TicketRepository } from '~/repositories/ticketRepository'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

export class ButtonTicketFeedbackHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-feedback') return this.none()

    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) =>
    this.createTicket(interaction)
  )

  private async createTicket(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guild || !interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const ticketConfig = await GuildRepository.getTicketConfig({
      guildId: interaction.guildId
    })

    if (!ticketConfig) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.TICKET_CONFIG_NOT_FOUND_DESCRIPTION
      })
    }

    const ticketChannel = interaction.channel as TextChannel

    const now = new Date()

    const code = await TicketRepository.generateTicketCode(interaction.guildId, 'FEEDBACK')

    const thread = await ticketChannel.threads.create({
      name: `#${code} - Góp Ý`,
      type: ChannelType.PrivateThread,
      invitable: false
    })

    await thread.members.add(interaction.user.id)
    await thread.members.add(interaction.guild.ownerId)

    const ticketInfoMessage = await thread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Bắt đầu hỗ trợ')
          .setDescription(`Vui lòng cung cấp đầy đủ thông tin chi tiết về góp ý của bạn.`)
          .setFields(
            {
              name: 'Mã phiếu',
              value: `**_#${code}_**`,
              inline: false
            },
            {
              name: 'Người góp ý',
              value: `<@${interaction.user.id}>`,
              inline: false
            },
            {
              name: 'Thời gian tạo',
              value: `<t:${Math.floor(now.getTime() / 1000)}:R>`,
              inline: false
            }
          )
      ]
    })

    await TicketRepository.createTicket({
      guildId: interaction.guildId,
      requesterId: interaction.user.id,
      type: 'FEEDBACK',
      threadId: thread.id
    })

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Tạo thành công',
          description: `Phiếu hỗ trợ đã được tạo thành công, bạn hãy vào <#${thread.id}> để cung cấp thông tin chi tiết về góp ý của bạn.`
        })
      ]
    })
    await deleteReplyInteraction(interaction)
  }
}
