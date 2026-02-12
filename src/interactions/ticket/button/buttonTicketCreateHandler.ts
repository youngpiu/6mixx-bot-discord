import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MessageFlags
} from 'discord.js'

import { TicketType } from 'generated/prisma/client'

import { GuildOnlyError, NotConfiguredError, NotFoundError } from '~/core/errorResponse'

import { TicketHelper } from '~/helpers/TicketHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'
import { TicketRepository } from '~/repositories/ticketRepository'

// Configuration for each ticket type button
// Maps ticket types to their custom IDs and initial descriptions
const TICKET_BUTTON_CONFIG: Record<
  TicketType,
  {
    customId: string
    description: string
  }
> = {
  BUG: {
    customId: 'btn-ticket-bug',
    description: 'Vui lòng mô tả chi tiết về lỗi mà bạn gặp phải.'
  },
  FEEDBACK: {
    customId: 'btn-ticket-feedback',
    description: 'Vui lòng mô tả chi tiết về góp ý của bạn.'
  },
  REPORT: {
    customId: 'btn-ticket-report',
    description: 'Vui lòng mô tả chi tiết về nội dung bạn muốn báo cáo.'
  }
}

export class ButtonTicketCreateHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    // Check if customId matches any ticket creation button configuration
    for (const [type, config] of Object.entries(TICKET_BUTTON_CONFIG)) {
      if (interaction.customId === config.customId) {
        return this.some({ type: type as TicketType, config })
      }
    }
    return this.none()
  }

  // Handles ticket creation logic
  public run = asyncInteractionHandler<
    ButtonInteraction,
    { type: TicketType; config: { customId: string; description: string } }
  >(async (interaction, result) => {
    if (!result) return

    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guild || !interaction.guildId) throw new GuildOnlyError()

    // Fetch config and generate code in parallel
    const [ticketConfig, code] = await Promise.all([
      GuildRepository.getTicketConfig(interaction.guildId),
      TicketRepository.generateTicketCode(interaction.guildId, result.type)
    ])

    const ticketCategoryId = ticketConfig?.ticketCategoryId

    // Ensure ticket system is configured
    if (!ticketCategoryId) {
      throw new NotConfiguredError({
        featureName: 'Hệ thống hỗ trợ thành viên'
      })
    }

    const category = interaction.guild.channels.cache.get(ticketCategoryId)
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new NotFoundError({
        description: 'Danh mục chứa kênh hỗ trợ không tồn tại hoặc không hợp lệ.'
      })
    }

    const now = new Date()

    // Create text channel in the configured category
    // Set permissions: Everyone (deny view), User (allow view/send)
    const ticketChannel = await interaction.guild.channels.create({
      name: `${code}-${TicketHelper.getTicketTypeLabel(result.type).toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: ticketCategoryId,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: ['ViewChannel']
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
        }
      ]
    })

    // Construct valid initial message
    const containerMessage = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(lines('## Bắt đầu hỗ trợ', result.config.description))
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `- **Mã phiếu:** _#${code}_`,
            `- **Người tạo:** <@${interaction.user.id}>`,
            `- **Thời gian tạo:** <t:${Math.floor(now.getTime() / 1000)}:R>`
          )
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((row) =>
        row
          .addComponents(
            new ButtonBuilder()
              .setCustomId('btn-ticket-close')
              .setLabel('Đóng')
              .setStyle(ButtonStyle.Secondary)
          )
          .addComponents(
            new ButtonBuilder()
              .setCustomId('btn-ticket-close-reason')
              .setLabel('Đóng với lý do')
              .setStyle(ButtonStyle.Danger)
          )
      )

    // Send structure message to the new channel
    const message = await ticketChannel.send({
      components: [containerMessage],
      flags: MessageFlags.IsComponentsV2
    })

    // Pin message, Create DB record, Send Log, and Reply to user concurrently
    await Promise.all([
      message.pin(),
      TicketRepository.createTicket({
        guildId: interaction.guildId,
        requesterId: interaction.user.id,
        type: result.type,
        code: code,
        channelId: ticketChannel.id,
        createdAt: now,
        updatedAt: now
      }).then((ticket) =>
        TicketHelper.sendTicketLog({
          guildId: interaction.guildId!,
          ticket,
          event: 'CREATED',
          executorId: interaction.user.id,
          channelId: ticketChannel.id
        })
      ),
      interaction.editReply({
        embeds: [
          createSuccessEmbed({
            title: 'Tạo thành công',
            description: `Kênh yêu cầu hỗ trợ của bạn đã được tạo thành công. Vui lòng truy cập vào <#${ticketChannel.id}> để thảo luận.`
          })
        ]
      })
    ])

    await deleteReplyInteraction(interaction)
  })
}
