import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { type ButtonInteraction, ChannelType, EmbedBuilder, type TextChannel } from 'discord.js'
import { env } from '~/config/env'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'
import { TicketRepository } from '~/repositories/ticketRepository'

export class ButtonTicketReportHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-report') return this.none()

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
        description: `Hệ thống phiếu hỗ trợ chưa được thiết lập,vui lòng liên hệ <@${env.SUPPORTER_DISCORD_ID}>`
      })
    }

    const ticketChannel = interaction.channel as TextChannel

    const now = new Date()

    const code = await TicketRepository.generateTicketCode(interaction.guildId, 'REPORT')

    const thread = await ticketChannel.threads.create({
      name: `Phiếu #${code} - Báo Cáo`,
      type: ChannelType.PrivateThread,
      invitable: false
    })

    await thread.members.add(interaction.user.id)
    await thread.members.add(interaction.guild.ownerId)

    await thread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Bắt đầu hỗ trợ')
          .setDescription(lines('Vui lòng mô tả chi tiết về', 'báo cáo của bạn.'))
          .setFields(
            {
              name: 'Mã phiếu',
              value: `**_#${code}_**`,
              inline: false
            },
            {
              name: 'Người tạo',
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
      type: 'REPORT',
      threadId: thread.id,
      createdAt: now,
      updatedAt: now
    })

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Tạo thành công',
          description: `Phiếu hỗ trợ đã được tạo thành công, bạn hãy vào <#${thread.id}> để cung cấp thông tin chi tiết về báo cáo của bạn.`
        })
      ]
    })
    await deleteReplyInteraction(interaction)
  }
}
