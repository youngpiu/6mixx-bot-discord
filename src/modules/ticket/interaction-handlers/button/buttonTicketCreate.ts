// Handler for creating new ticket channels based on type (BUG, FEEDBACK, REPORT)
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  ChannelType,
  Colors,
  MessageFlags
} from 'discord.js'

import { TicketType } from 'generated/prisma/client'

import { NormalError } from '~/core/errorResponse'

import { LoggerBuilder } from '~/shared/components/LoggerBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { GuildRepository } from '~/modules/ticket/repositories/guildRepository'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

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

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonTicketCreate extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    for (const [type, config] of Object.entries(TICKET_BUTTON_CONFIG)) {
      if (interaction.customId === config.customId) {
        return this.some({ type: type as TicketType, config })
      }
    }
    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return

    const { type, config } = result

    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guild) return

    const guildConfig = await GuildRepository.getConfig(interaction.guild.id)
    const code = await TicketRepository.generateCode(interaction.guild.id, type)

    const ticketCategoryId = guildConfig?.ticketCategoryId

    if (!ticketCategoryId) {
      throw new NormalError('Hệ thống hỗ trợ thành viên chưa được thiết lập.')
    }

    const category = interaction.guild.channels.cache.get(ticketCategoryId)
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new NormalError(
        'Danh mục chứa kênh hỗ trợ không tồn tại hoặc không hợp lệ.'
      )
    }

    const now = new Date()

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
          allow: [
            'ViewChannel',
            'SendMessages',
            'ReadMessageHistory',
            'AttachFiles'
          ]
        }
      ]
    })

    const containerMessage = new LoggerBuilder({
      title: `Bắt đầu hỗ trợ\n-# ${config.description}`,
      color: Colors.Blue
    })
      .addFields([
        ['Mã phiếu', `_#${code}_`],
        ['Người tạo', `<@${interaction.user.id}>`],
        ['Thời gian tạo', `<t:${Math.floor(now.getTime() / 1000)}:R>`]
      ])
      .build()

    const message = await ticketChannel.send({
      components: containerMessage,
      flags: MessageFlags.IsComponentsV2
    })

    await Promise.all([
      message.pin(),
      TicketRepository.create({
        guildId: interaction.guild.id,
        requesterId: interaction.user.id,
        type: type,
        code: code,
        channelId: ticketChannel.id,
        createdAt: now,
        updatedAt: now
      }).then((ticket) =>
        TicketHelper.sendTicketLog({
          guildId: interaction.guild!.id,
          ticket,
          event: 'CREATED',
          executorId: interaction.user.id,
          channelId: ticketChannel.id
        })
      ),
      InteractionUtil.replySuccess(
        interaction,
        `Đã tạo kênh hỗ trợ thành công, vui lòng truy cập <#${ticketChannel.id}> để thảo luận.`
      )
    ])
  }
}
