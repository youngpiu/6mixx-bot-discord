import { container } from '@sapphire/pieces'
import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextChannel
} from 'discord.js'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class TicketSetupCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const ticketChannel = interaction.options.getChannel('ticket-channel') as TextChannel

    if (!ticketChannel) {
      throw new BadRequestError({
        description: 'Vui lòng lựa chọn một kênh văn bản để thiết lập kênh hỗ trợ cho thành viên.'
      })
    }

    const existingConfig = await GuildRepository.getTicketConfig({
      guildId: interaction.guildId
    })

    if (existingConfig?.tutorialMessageId) {
      try {
        const oldChannel = await container.client.channels.fetch(existingConfig.ticketChannelId)
        if (oldChannel?.isTextBased()) {
          const oldMessage = await oldChannel.messages.fetch(existingConfig.tutorialMessageId)
          await oldMessage.delete()
        }
      } catch {
        // ignore
      }
    }

    const tutorialMessage = await ticketChannel.send({
      components: [this.createTicketEmbed()],
      flags: ['IsComponentsV2']
    })

    await GuildRepository.upsertTicketConfig({
      guildId: interaction.guildId,
      data: {
        ticketChannelId: ticketChannel.id,
        tutorialMessageId: tutorialMessage.id
      }
    })

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Thiết lập thành công',
          description: `Đã thiết lập và gửi tin nhắn hướng dẫn sử dụng tới kênh <#${ticketChannel.id}>.`
        })
      ]
    })

    await deleteReplyInteraction(interaction)
  }

  private static createTicketEmbed() {
    return (
      new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent(
            '## Trung Tâm Hỗ Trợ VNSWER\n' +
              '-# Tại đây, bạn có thể gửi báo cáo vi phạm luật, góp ý cải thiện máy chủ và báo lỗi nếu có trong máy chủ **VNMIXX**.'
          )
        )

        // ===== Báo cáo vi phạm =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                '### Báo cáo vi phạm\n' +
                  '-# Dùng khi bạn thấy một hành vi vi phạm luật trong máy chủ **VNMIXX**.\n' +
                  '- **Yêu cầu bắt buộc**\n' +
                  '  - Đính kèm bằng chứng rõ ràng, chính xác, không qua chỉnh sửa.\n' +
                  '  - Có thể gửi đường dẫn tin nhắn nếu có và tag người liên quan.\n' +
                  '- **Lưu ý**\n' +
                  '  - Không giải quyết riêng qua tin nhắn riêng tư (DM).\n' +
                  '  - Gửi báo cáo mà không có mục đích gì sẽ bị hạn chế 1 ngày.'
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('btn-ticket-report')
                .setLabel('Báo cáo')
                .setStyle(ButtonStyle.Danger)
            )
        )

        // ===== Góp ý cải thiện =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                '### Góp ý cải thiện\n' +
                  '-# Dùng khi bạn có một ý tưởng đề xuất hoặc góp ý cải thiện máy chủ **VNMIXX**.\n' +
                  '- **Yêu cầu bắt buộc**\n' +
                  '  - Mô tả rõ ràng những góp ý, ý tưởng của bạn.\n' +
                  '  - Có thể gửi hình ảnh, biểu đồ về ý tưởng đó nếu có.\n' +
                  '- **Lưu ý**\n' +
                  '  - Gửi góp ý mà không có mục đích gì sẽ bị hạn chế 1 ngày.'
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('btn-ticket-feedback')
                .setLabel('Góp ý')
                .setStyle(ButtonStyle.Success)
            )
        )

        // ===== Báo lỗi BOT =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                '### Báo lỗi BOT\n' +
                  '-# Dùng khi bạn gặp lỗi trong quá trình sử dụng BOT.\n' +
                  '- **Yêu cầu bắt buộc**\n' +
                  '  - Mô tả rõ ràng lỗi mà bạn gặp phải.\n' +
                  '  - Cung cấp hình ảnh, quá trình từng bước bạn làm trước và sau khi gặp lỗi.\n' +
                  '- **Lưu ý**\n' +
                  '  - Không tiếp nhận các lỗi không liên quan tới BOT.\n' +
                  '  - Gửi báo lỗi mà không có mục đích gì sẽ bị hạn chế 1 ngày.'
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('btn-ticket-bug')
                .setLabel('Báo lỗi')
                .setStyle(ButtonStyle.Danger)
            )
        )
    )
  }
}
