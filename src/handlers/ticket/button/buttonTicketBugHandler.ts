import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ChannelType,
  EmbedBuilder,
  type ButtonInteraction,
  type TextChannel
} from 'discord.js'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'
import { GuildRepository } from '~/repositories/guildRepository'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { TicketRepository } from '~/repositories/ticketRepository'

export class ButtonTicketBugHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-bug') return this.none()

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
        description:
          ERROR_MESSAGE.BAD_REQUEST.TICKET_CONFIG_NOT_FOUND_DESCRIPTION
      })
    }

    const ticketChannel = interaction.channel as TextChannel

    const now = new Date()

    const code = await TicketRepository.generateTicketCode(
      interaction.guildId,
      'BUG'
    )

    const thread = await ticketChannel.threads.create({
      name: `#${code} - Báo Lỗi`,
      type: ChannelType.PrivateThread,
      invitable: false
    })

    await thread.members.add(interaction.user.id)
    await thread.members.add(interaction.guild.ownerId)

    await thread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Bắt đầu hỗ trợ')
          .setDescription(
            `Vui lòng cung cấp đầy đủ thông tin chi tiết về lỗi bạn gặp phải.`
          )
          .setColor([255, 152, 0])
          .setFields(
            {
              name: 'Mã phiếu',
              value: `**_#${code}_**`,
              inline: true
            },
            {
              name: 'Người báo lỗi',
              value: `<@${interaction.user.id}>`,
              inline: true
            },
            {
              name: 'Thời gian tạo',
              value: `<t:${Math.floor(now.getTime() / 1000)}:R>`,
              inline: true
            }
          )
      ]
    })

    await Promise.all([
      await thread.send({
        stickers: ['751606379340365864']
      }),
      TicketRepository.createTicket({
        guildId: interaction.guildId,
        requesterId: interaction.user.id,
        type: 'BUG',
        threadId: thread.id
      })
    ])

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Tạo thành công')
          .setDescription(
            `Phiếu hỗ trợ đã được tạo thành công, bạn hãy vào <#${thread.id}> để cung cấp thông tin chi tiết về lỗi bạn gặp phải.`
          )
          .setColor([255, 152, 0])
      ]
    })
  }
}
