import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ContainerBuilder } from 'discord.js'

import { BadRequestError, GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ButtonTicketSendHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-send') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    if (!interaction.guildId) throw new GuildOnlyError()

    const guild = await GuildRepository.getGuild(interaction.guildId)
    const serviceForumChannelId = guild?.serviceForumChannelId

    if (!serviceForumChannelId)
      throw new BadRequestError({ description: 'Kênh dịch vụ chưa được cài đặt' })

    const forumChannel = interaction.guild?.channels.cache.get(serviceForumChannelId)

    if (!forumChannel || !forumChannel.isThreadOnly()) {
      throw new BadRequestError({
        description:
          'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn, vui lòng cài đặt lại.'
      })
    }

    const ticketConfig = await GuildRepository.getTicketConfig(interaction.guildId)
    if (ticketConfig?.ticketTutorialThreadId) {
      try {
        const oldThread = await forumChannel.threads.fetch(ticketConfig.ticketTutorialThreadId)
        if (oldThread) await oldThread.delete()
      } catch (error) {
        if (error instanceof Error) {
          this.container.logger.error(error.message)
        }
      }
    }

    const thread = await forumChannel.threads.create({
      name: '🎟️ NƠI GỬI YÊU CẦU HỖ TRỢ [BÁO CÁO|GÓP Ý|BÁO LỖI] 🎟️',
      message: {
        components: [await this.createTicketTutorialMessage()],
        flags: ['IsComponentsV2']
      }
    })

    await GuildRepository.updateConfig(interaction.guildId, {
      ticketTutorialThreadId: thread.id
    })

    await interaction.reply({
      embeds: [
        createSuccessEmbed({
          description: `Bài đăng hướng dẫn gửi yêu cầu hỗ trợ đã được tạo: <#${thread.id}>`
        })
      ],
      flags: ['Ephemeral']
    })
    await deleteReplyInteraction(interaction)
  })

  private async createTicketTutorialMessage() {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '## Nơi Hỗ Trợ VNSWER',
            '-# Tại đây, bạn có thể gửi báo cáo vi phạm luật, góp ý cải thiện máy chủ và báo lỗi nếu có trong máy chủ **VNMIXX**.'
          )
        )
      )

      // ===== Báo cáo vi phạm =====
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              lines(
                '### Báo cáo vi phạm',
                '-# Dùng khi bạn thấy một hành vi vi phạm luật trong máy chủ **VNMIXX**.',
                '- **Yêu cầu bắt buộc**',
                '  - Đính kèm bằng chứng rõ ràng, chính xác, không qua chỉnh sửa.',
                '  - Có thể gửi đường dẫn tin nhắn nếu có và tag người liên quan.',
                '- **Lưu ý**',
                '  - Không giải quyết riêng qua tin nhắn riêng tư (DM).',
                '  - Gửi báo cáo mà không có mục đích gì sẽ bị hạn chế 1 ngày.'
              )
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
              lines(
                '### Góp ý cải thiện',
                '-# Dùng khi bạn có một ý tưởng đề xuất hoặc góp ý cải thiện máy chủ **VNMIXX**.',
                '- **Yêu cầu bắt buộc**',
                '  - Mô tả rõ ràng những góp ý, ý tưởng của bạn.',
                '  - Có thể gửi hình ảnh, biểu đồ về ý tưởng đó nếu có.',
                '- **Lưu ý**',
                '  - Gửi góp ý mà không có mục đích gì sẽ bị hạn chế 1 ngày.'
              )
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
              lines(
                '### Báo lỗi BOT',
                '-# Dùng khi bạn gặp lỗi trong quá trình sử dụng BOT.',
                '- **Yêu cầu bắt buộc**',
                '  - Mô tả rõ ràng lỗi mà bạn gặp phải.',
                '  - Cung cấp hình ảnh, quá trình từng bước bạn làm trước và sau khi gặp lỗi.',
                '- **Lưu ý**',
                '  - Không tiếp nhận các lỗi không liên quan tới BOT.',
                '  - Gửi báo lỗi mà không có mục đích gì sẽ bị hạn chế 1 ngày.'
              )
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('btn-ticket-bug')
              .setLabel('Báo lỗi')
              .setStyle(ButtonStyle.Danger)
          )
      )

    return container
  }
}
