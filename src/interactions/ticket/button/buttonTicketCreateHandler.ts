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

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { TicketHelper } from '~/helpers/TicketHelper'
import { InteractionUtil } from '~/utils/messageUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'
import { TicketRepository } from '~/repositories/ticketRepository'

// Configuration for each ticket type button
const TICKET_BUTTON_CONFIG: Record<
  TicketType,
  {
    customId: string
    description: string
  }
> = {
  BUG: {
    customId: CUSTOM_ID.BTN_TICKET_BUG,
    description: 'Vui lòng mô tả chi tiết về lỗi mà bạn gặp phải.'
  },
  FEEDBACK: {
    customId: CUSTOM_ID.BTN_TICKET_FEEDBACK,
    description: 'Vui lòng mô tả chi tiết về góp ý của bạn.'
  },
  REPORT: {
    customId: CUSTOM_ID.BTN_TICKET_REPORT,
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
    for (const [type, config] of Object.entries(TICKET_BUTTON_CONFIG)) {
      if (interaction.customId === config.customId) {
        return this.some({ type: type as TicketType, config })
      }
    }
    return this.none()
  }

  public async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
    if (!result) return

    const { type, config } = result as {
      type: TicketType
      config: { customId: string; description: string }
    }

    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guild || !interaction.guildId)
      throw new NormalError('Lệnh này chỉ dùng trong máy chủ.')

    // Fetch config and generate code in parallel
    const [ticketConfig, code] = await Promise.all([
      GuildRepository.getTicketConfig(interaction.guildId),
      TicketRepository.generateTicketCode(interaction.guildId, type)
    ])

    const ticketCategoryId = ticketConfig?.ticketCategoryId

    if (!ticketCategoryId) {
      throw new NormalError('Hệ thống hỗ trợ thành viên chưa được thiết lập.')
    }

    const category = interaction.guild.channels.cache.get(ticketCategoryId)
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new NormalError('Danh mục chứa kênh hỗ trợ không tồn tại hoặc không hợp lệ.')
    }

    const now = new Date()

    // Create text channel in the configured category
    const ticketChannel = await interaction.guild.channels.create({
      name: `${code}-${TicketHelper.getTicketTypeLabel(type).toLowerCase()}`,
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

    const containerMessage = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(lines('## Bắt đầu hỗ trợ', config.description))
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
              .setCustomId(CUSTOM_ID.BTN_TICKET_CLOSE)
              .setLabel('Đóng')
              .setStyle(ButtonStyle.Secondary)
          )
          .addComponents(
            new ButtonBuilder()
              .setCustomId(CUSTOM_ID.BTN_TICKET_CLOSE_REASON)
              .setLabel('Đóng với lý do')
              .setStyle(ButtonStyle.Danger)
          )
      )

    const message = await ticketChannel.send({
      components: [containerMessage],
      flags: MessageFlags.IsComponentsV2
    })

    await Promise.all([
      message.pin(),
      TicketRepository.createTicket({
        guildId: interaction.guildId,
        requesterId: interaction.user.id,
        type: type,
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
      InteractionUtil.replySuccess(
        interaction,
        `Kênh yêu cầu hỗ trợ của bạn đã được tạo thành công. Vui lòng truy cập vào <#${ticketChannel.id}> để thảo luận.`
      )
    ])
  }
}
