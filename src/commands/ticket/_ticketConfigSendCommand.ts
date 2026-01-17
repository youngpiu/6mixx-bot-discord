import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder
} from 'discord.js'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { RGB_COLOR_TEMPLATE } from '~/constants/colorConstant'
import { BadRequestError } from '~/core/errorResponse'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { GuildRepository } from '~/repositories/guildRepository'

export class TicketConfigSendCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const ticketConfig = await GuildRepository.getTicketConfig(
      interaction.guildId
    )

    if (!ticketConfig || !ticketConfig.ticketChannelId) {
      throw new BadRequestError({
        description:
          'Vui lòng thiết lập kênh hỗ trợ trước khi sử dụng lệnh này.'
      })
    }

    const ticketChannel = interaction.guild?.channels.cache.get(
      ticketConfig.ticketChannelId
    )

    if (!ticketChannel || !ticketChannel.isTextBased())
      throw new BadRequestError({
        description: 'Kênh được thiết lập không còn tồn tại trong máy chủ.'
      })

    await ticketChannel.send({
      components: [this.createTicketEmbed()],
      flags: ['IsComponentsV2']
    })

    return interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Gửi thành công',
          description:
            'Đã gửi tin nhắn hướng dẫn sử dụng tới kênh đã được thiết lập.'
        })
      ]
    })
  }

  private static createTicketEmbed() {
    return (
      new ContainerBuilder()
        .setAccentColor(RGB_COLOR_TEMPLATE.TICKET_EMBED)
        .addTextDisplayComponents((text) =>
          text.setContent(
            '📌 **VNMIXx – Báo cáo & Góp ý**\nVui lòng đọc kỹ quy định trước khi gửi.'
          )
        )

        // ===== Báo cáo vi phạm =====
        .addSeparatorComponents((sep) => sep)

        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                '🚨 **BÁO CÁO VI PHẠM**\n\n' +
                  '• Chỉ xử lý các vấn đề xảy ra trong **VNMIXx**\n' +
                  '• **Không xử lý tin nhắn riêng (DM)**\n\n' +
                  '**Yêu cầu bắt buộc:**\n' +
                  '• Đính kèm **bằng chứng rõ ràng**\n' +
                  '• **Tag người liên quan**\n\n' +
                  '**Cách gửi bằng chứng:**\n' +
                  '• Ảnh chụp màn hình **đầy đủ, không cắt xén**\n' +
                  '• Hoặc **Message Link** *(Right click → Copy Message Link)*\n\n' +
                  '_Gửi báo cáo không có mục đích sẽ bị hạn chế **1 ngày**_'
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('report_violation')
                .setLabel('Báo cáo')
                .setStyle(ButtonStyle.Danger)
            )
        )

        // ===== Góp ý =====
        .addSeparatorComponents((sep) => sep)

        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                '💡 **GÓP Ý CHO VNMIXx**\n\n' +
                  '• Chỉ tiếp nhận góp ý liên quan đến **VNMIXx**\n' +
                  '• **Không phản hồi** góp ý mang tính công kích\n\n' +
                  '**Yêu cầu bắt buộc:**\n' +
                  '• Nội dung góp ý **rõ ràng, cụ thể**\n' +
                  '• Tag người liên quan *(nếu có)*\n\n' +
                  '**Minh họa:**\n' +
                  '• Ảnh chụp màn hình *(nếu cần)*\n' +
                  '• Hoặc **Message Link**'
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('send_feedback')
                .setLabel('Góp ý')
                .setStyle(ButtonStyle.Primary)
            )
        )
    )
  }
}
