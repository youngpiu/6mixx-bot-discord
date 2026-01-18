import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder
} from 'discord.js'
import { createSuccessEmbed } from '~/utils/embedUtil'
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
        .addTextDisplayComponents((text) =>
          text.setContent(
            '## Trung Tâm Hỗ Trợ Thành Viên\n' +
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
                  '-# Dùng khi bạn thấy một hành vi vi phạm luật trong máy chủ **VNMIXX**\n' +
                  '- Yêu cầu bắt buộc\n' +
                  '  - Đính kèm bằng chứng rõ ràng, chính xác, không qua chỉnh sửa.\n' +
                  '  - Có thể gửi đường dẫn tin nhắn nếu có và tag người liên quan.\n' +
                  '- Lưu ý\n' +
                  '  - Không giải quyết riêng qua tin nhắn riêng tư (DM)\n' +
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
                  '- Yêu cầu bắt buộc\n' +
                  '  - Mô tả rõ ràng những góp ý, ý tưởng của bạn.\n' +
                  '  - Có thể gửi hình ảnh, biểu đồ về ý tưởng đó nếu có.\n' +
                  '- Lưu ý\n' +
                  '  - Gửi góp ý mà không có mục đích gì sẽ bị hạn chế 1 ngày.'
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('btn-ticket-feedback')
                .setLabel('Góp ý')
                .setStyle(ButtonStyle.Primary)
            )
        )

        // ===== Báo lỗi máy chủ =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                '### Báo lỗi máy chủ\n' +
                  '-# Dùng khi bạn thấy lỗi của <@1431578647558619207> trong quá trình sử dụng.\n' +
                  '- Yêu cầu bắt buộc\n' +
                  '  - Mô tả rõ ràng lỗi mà bạn gặp phải\n' +
                  '  - Cung cấp hình ảnh, quá trình tường bước bạn làm trước và sau khi gặp lỗi.\n' +
                  '- Lưu ý\n' +
                  '  - Không tiếp nhận các lỗi không liên quan tới <@1431578647558619207>\n' +
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
