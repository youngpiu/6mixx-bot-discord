import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework'
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ContainerBuilder } from 'discord.js'
import { env } from '~/config/env'

import { ANIMATED_EMOJI } from '~/constants/iconConstant'
import { BadRequestError, GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

const SEND_GUIDE_CONFIG = {
  'btn-confession-send': {
    channelIdKey: 'serviceForumChannelId',
    threadIdKey: 'confessionTutorialThreadId',
    threadName: '💌 NƠI GỬI CONFESSION 💌',
    successMessage: 'Bài đăng hướng dẫn gửi confession đã được tạo',
    successUpdateMessage: 'Bài đăng hướng dẫn gửi confession đã được chỉnh sửa',
    errorChannelNotConfigured: 'Kênh dịch vụ chưa được thiết lập.',
    errorChannelInvalid: 'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn.'
  },
  'btn-ticket-send': {
    channelIdKey: 'serviceForumChannelId',
    threadIdKey: 'ticketTutorialThreadId',
    threadName: '🎟️ NƠI GỬI YÊU CẦU HỖ TRỢ [ BÁO CÁO | GÓP Ý | BÁO LỖI ] 🎟️',
    successMessage: 'Bài đăng hướng dẫn gửi yêu cầu hỗ trợ đã được tạo',
    successUpdateMessage: 'Bài đăng hướng dẫn gửi yêu cầu hỗ trợ đã được chỉnh sửa',
    errorChannelNotConfigured: 'Kênh dịch vụ chưa được thiết lập.',
    errorChannelInvalid: 'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn.'
  },
  'btn-donation-send': {
    channelIdKey: 'serviceForumChannelId',
    threadIdKey: 'donationTutorialThreadId',
    threadName: '💝 NƠI GÓP GẠCH NUÔI BOT 💝',
    successMessage: 'Bài đăng hướng dẫn quyên góp đã được tạo',
    successUpdateMessage: 'Bài đăng hướng dẫn quyên góp đã được chỉnh sửa',
    errorChannelNotConfigured: 'Kênh dịch vụ chưa được thiết lập.',
    errorChannelInvalid: 'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn.'
  }
} as const

type SendGuideButtonId = keyof typeof SEND_GUIDE_CONFIG
type ChannelIdKey = (typeof SEND_GUIDE_CONFIG)[SendGuideButtonId]['channelIdKey']
type ThreadIdKey = (typeof SEND_GUIDE_CONFIG)[SendGuideButtonId]['threadIdKey']

export class ButtonSendGuideHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!(interaction.customId in SEND_GUIDE_CONFIG)) return this.none()
    return this.some({ buttonId: interaction.customId as SendGuideButtonId })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { buttonId: SendGuideButtonId }>(
    async (interaction, result) => {
      if (!result) return

      const { buttonId } = result
      const config = SEND_GUIDE_CONFIG[buttonId]

      if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()
      await interaction.deferReply({ flags: ['Ephemeral'] })

      const guildConfig = await GuildRepository.getGuild(interaction.guildId)
      const forumChannelId = guildConfig?.[config.channelIdKey as ChannelIdKey]

      if (!forumChannelId)
        throw new BadRequestError({ description: config.errorChannelNotConfigured })

      const forumChannel = await interaction.guild.channels.fetch(forumChannelId)

      if (!forumChannel || !forumChannel.isThreadOnly()) {
        throw new BadRequestError({ description: config.errorChannelInvalid })
      }

      // Get message components based on button type
      const messageComponents = this.createGuideMessage(buttonId)

      // Try to edit existing thread's first message, or create new thread
      const oldThreadId = guildConfig?.[config.threadIdKey as ThreadIdKey]
      let thread
      let isUpdated = false

      if (oldThreadId) {
        try {
          const oldThread = await forumChannel.threads.fetch(oldThreadId)
          if (oldThread) {
            const firstMessage = await oldThread.fetchStarterMessage()
            if (firstMessage) {
              await firstMessage.edit({
                components: [messageComponents],
                flags: ['IsComponentsV2']
              })
              thread = oldThread
              isUpdated = true
            }
          }
        } catch (error) {
          container.logger.error(error)
        }
      }

      // Create new thread if old one doesn't exist
      if (!thread) {
        thread = await forumChannel.threads.create({
          name: config.threadName,
          message: {
            components: [messageComponents],
            flags: ['IsComponentsV2']
          }
        })

        await GuildRepository.updateConfig(interaction.guildId, {
          [config.threadIdKey]: thread.id
        })
      }

      await interaction.editReply({
        embeds: [
          createSuccessEmbed({
            description: `${isUpdated ? config.successUpdateMessage : config.successMessage}: <#${thread.id}>`
          })
        ]
      })
      await deleteReplyInteraction(interaction)
    }
  )

  private createGuideMessage(buttonId: SendGuideButtonId): ContainerBuilder {
    switch (buttonId) {
      case 'btn-confession-send':
        return this.createConfessionGuide()
      case 'btn-ticket-send':
        return this.createTicketGuide()
      case 'btn-donation-send':
        return this.createDonationGuide()
    }
  }

  private createConfessionGuide(): ContainerBuilder {
    return (
      new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent(
            lines(
              `## ${ANIMATED_EMOJI.WING_LEFT} NƠI GỬI CONFESSION ${ANIMATED_EMOJI.WING_RIGHT}`,
              '-# Tại đây, bạn có thể chia sẻ những câu chuyện cá nhân liên quan đến **NMIXX* hoặc đời thường.'
            )
          )
        )

        // ===== Gửi ẩn danh =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                lines(
                  `### ${ANIMATED_EMOJI.ARROW_RIGHT}GỬI ẨN DANH`,
                  '-# Confession của bạn sẽ được gửi ẩn danh, không ai biết được danh tính người gửi.',
                  '- **Lưu ý**',
                  '  - Không chấp nhận confession vi phạm nội quy máy chủ.',
                  '  - Hạn chế các câu chuyện về tình yêu hoặc gia đình mang nội dung tiêu cực.'
                )
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('btn-confession-create-anonymous')
                .setLabel('Gửi ẩn danh')
                .setStyle(ButtonStyle.Primary)
            )
        )

        // ===== Gửi công khai =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                lines(
                  `### ${ANIMATED_EMOJI.ARROW_RIGHT}GỬI CÔNG KHAI`,
                  '-# Confession của bạn sẽ được gửi kèm tên của bạn.',
                  '- **Lưu ý**',
                  '  - Không chấp nhận confession vi phạm nội quy máy chủ.',
                  '  - Hạn chế các câu chuyện về tình yêu hoặc gia đình mang nội dung tiêu cực.'
                )
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('btn-confession-create-public')
                .setLabel('Gửi công khai')
                .setStyle(ButtonStyle.Danger)
            )
        )
    )
  }

  private createTicketGuide(): ContainerBuilder {
    return (
      new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent(
            lines(
              `## ${ANIMATED_EMOJI.WING_LEFT} NƠI GỬI YÊU CẦU HỖ TRỢ ${ANIMATED_EMOJI.WING_RIGHT}`,
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
                  `### ${ANIMATED_EMOJI.CYAN_DOT} Báo cáo vi phạm`,
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
                  `### ${ANIMATED_EMOJI.CYAN_DOT} Góp ý cải thiện`,
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
                  `### ${ANIMATED_EMOJI.CYAN_DOT} Báo lỗi bot`,
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
    )
  }

  private createDonationGuide(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `## ${ANIMATED_EMOJI.WING_LEFT} NƠI GÓP GẠCH NUÔI BOT ${ANIMATED_EMOJI.WING_RIGHT}`,
            '-# Tại đây, bạn có thể thực hiện quyên góp ủng hộ để duy trì hoạt động của **BOT 6MIXX**.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Cam kết:**',
            '  - Khoản quyên góp được sử dụng cho chi phí thuê máy chủ và các chi phí phát sinh cho hoạt động của BOT.',
            '  - Không sử dụng khoản tiền này cho mục đích cá nhân hoặc các dịch vụ không liên quan đến BOT.',
            '  - Thông tin chuyển khoản được tiếp nhận theo hình thức ẩn danh và không hiển thị ở bất cứ đâu.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Lưu ý:**',
            '  - Không một ai kể cả **Ban quản lý** có thể biết được danh tính người quyên góp để đảm bảo không xảy ra thiên vị khi xử lý vi phạm.',
            '  - Việc quyên góp không tạo ra bất kỳ hình thức ưu tiên, đặc quyền hoặc miễn trừ nào khi xử lý vi phạm nội quy máy chủ **VNMIXX**.',
            `  - <@${env.BOT_OWNER_DISCORD_ID}> chịu **trách nhiệm cá nhân** hoàn toàn về mọi cam kết đối với người quyên góp.`
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Đọc thêm:**',
            '  - [VPS là gì?](https://fptshop.com.vn/tin-tuc/thu-thuat/vps-la-gi-159221)',
            '  - [Tại sao BOT DISCORD cần VPS?](https://chat.openai.com/?q=T%E1%BA%A1i%20sao%20BOT%20DISCORD%20c%E1%BA%A7n%20VPS%3F)'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('btn-donation-create')
            .setLabel('Quyên góp')
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId('btn-donation-stats')
            .setLabel('Thống kê')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('btn-disbursement-list')
            .setLabel('Các khoản chi')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  }
}
