import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder
} from 'discord.js'
import { env } from '~/shared/config/env'
import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil, MessageUtil } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

import { NormalError } from '~/core/errorResponse'

const SEND_GUIDE_CONFIG = {
  [CUSTOM_ID.BTN_CONFESSION_SEND]: {
    channelIdKey: 'serviceForumChannelId',
    threadIdKey: 'confessionTutorialThreadId',
    threadName: '💌 NƠI GỬI CONFESSION 💌',
    successMessage: 'Bài đăng hướng dẫn gửi confession đã được tạo',
    successUpdateMessage: 'Bài đăng hướng dẫn gửi confession đã được chỉnh sửa',
    errorChannelNotConfigured:
      'Kênh dịch vụ chưa được thiết lập, không thể gửi hướng dẫn.',
    errorChannelInvalid:
      'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn, không thể gửi hướng dẫn.'
  },
  [CUSTOM_ID.BTN_TICKET_SEND]: {
    channelIdKey: 'serviceForumChannelId',
    threadIdKey: 'ticketTutorialThreadId',
    threadName: '🎟️ NƠI GỬI HỖ TRỢ THÀNH VIÊN [ BÁO CÁO | GÓP Ý | BÁO LỖI ] 🎟️',
    successMessage: 'Bài đăng hướng dẫn gửi yêu cầu hỗ trợ đã được tạo',
    successUpdateMessage:
      'Bài đăng hướng dẫn gửi yêu cầu hỗ trợ đã được chỉnh sửa',
    errorChannelNotConfigured:
      'Kênh dịch vụ chưa được thiết lập, không thể gửi hướng dẫn.',
    errorChannelInvalid:
      'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn, không thể gửi hướng dẫn.'
  },
  [CUSTOM_ID.BTN_DONATION_SEND]: {
    channelIdKey: 'serviceForumChannelId',
    threadIdKey: 'donationTutorialThreadId',
    threadName: '💝 NƠI GÓP GẠCH NUÔI BOT 💝',
    successMessage: 'Bài đăng hướng dẫn quyên góp đã được tạo',
    successUpdateMessage: 'Bài đăng hướng dẫn quyên góp đã được chỉnh sửa',
    errorChannelNotConfigured:
      'Kênh dịch vụ chưa được thiết lập, không thể gửi hướng dẫn.',
    errorChannelInvalid:
      'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn, không thể gửi hướng dẫn.'
  }
} as const

type SendGuideButtonId = keyof typeof SEND_GUIDE_CONFIG
type ChannelIdKey =
  (typeof SEND_GUIDE_CONFIG)[SendGuideButtonId]['channelIdKey']
type ThreadIdKey = (typeof SEND_GUIDE_CONFIG)[SendGuideButtonId]['threadIdKey']

export class ButtonSendGuide extends InteractionHandler {
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
    if (!(interaction.customId in SEND_GUIDE_CONFIG)) return this.none()
    return this.some({ buttonId: interaction.customId as SendGuideButtonId })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result || !interaction.guild) return

    await interaction.deferReply()

    const { buttonId } = result as { buttonId: SendGuideButtonId }
    const config = SEND_GUIDE_CONFIG[buttonId]

    const guildConfig = await GuildRepository.findUnique(interaction.guild.id)

    const forumChannelId = guildConfig?.[config.channelIdKey as ChannelIdKey]

    if (!forumChannelId) throw new NormalError(config.errorChannelNotConfigured)

    const forumChannel = await interaction.guild.channels.fetch(forumChannelId)

    if (!forumChannel || !forumChannel.isThreadOnly()) {
      throw new NormalError(config.errorChannelInvalid)
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
            MessageUtil.edit(firstMessage, {
              components: [messageComponents],
              flags: ['IsComponentsV2']
            })
            thread = oldThread
            isUpdated = true
          }
        }
      } catch {
        // ignore
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

      await GuildRepository.update(interaction.guild.id, {
        [config.threadIdKey]: thread.id
      })
    }

    await InteractionUtil.replySuccess(
      interaction,
      `${isUpdated ? config.successUpdateMessage : config.successMessage}: <#${thread.id}>`
    )
  }

  private createGuideMessage(buttonId: SendGuideButtonId): ContainerBuilder {
    switch (buttonId) {
      case CUSTOM_ID.BTN_CONFESSION_SEND:
        return this.createConfessionGuide()
      case CUSTOM_ID.BTN_TICKET_SEND:
        return this.createTicketGuide()
      case CUSTOM_ID.BTN_DONATION_SEND:
        return this.createDonationGuide()
    }
  }

  private createConfessionGuide(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `### ${ANIMATED_EMOJI.WING_LEFT} **NƠI GỬI CONFESSION** ${ANIMATED_EMOJI.WING_RIGHT}`,
            `-# Tại đây, bạn có thể chia sẻ những **câu chuyện, suy nghĩ hoặc tâm sự** liên quan đến **NMIXX** hoặc **cuộc sống thường ngày của bản thân**.`
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Lưu ý:**',
            '  - Confession sẽ được **kiểm duyệt trước khi đăng** để đảm bảo **phù hợp với cộng đồng**.',
            '  - Nội dung phải **tuân thủ nội quy** của máy chủ **VNMIXX**.',
            '  - Hạn chế các **chủ đề tiêu cực, nhạy cảm hoặc dễ gây tranh cãi** liên quan đến **tình yêu hoặc gia đình**.',
            '  - **Ban quản lý** có quyền **từ chối đăng** nếu nội dung **không phù hợp**.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Cam kết:**',
            '  - Mọi confession được gửi **dưới dạng ẩn danh** sẽ **không tiết lộ danh tính người gửi**, kể cả **Ban quản lý**.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_CONFESSION_SEND_PUBLIC)
            .setLabel('Gửi công khai')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_CONFESSION_SEND_ANONYMOUS)
            .setLabel('Gửi ẩn danh')
            .setStyle(ButtonStyle.Success)
        )
      )
  }

  private createTicketGuide(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `### ${ANIMATED_EMOJI.WING_LEFT} **NƠI GỬI HỖ TRỢ THÀNH VIÊN** ${ANIMATED_EMOJI.WING_RIGHT}`,
            '-# Tại đây, bạn có thể **gửi báo cáo vi phạm luật**, **góp ý cải thiện máy chủ** và **báo lỗi** nếu có trong máy chủ **VNMIXX**.'
          )
        )
      )

      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              lines(
                `### ${ANIMATED_EMOJI.BLUE_DOT} **Báo cáo vi phạm**`,
                '-# Dùng khi bạn thấy một **hành vi vi phạm luật** trong máy chủ **VNMIXX**.',
                '- **Yêu cầu bắt buộc**',
                '  - **Đính kèm bằng chứng rõ ràng, chính xác**, không qua chỉnh sửa.',
                '  - Có thể **gửi đường dẫn tin nhắn** nếu có và **tag người liên quan**.',
                '- **Lưu ý**',
                '  - **Không giải quyết riêng qua tin nhắn riêng tư (DM)**.',
                '  - Gửi báo cáo **mà không có mục đích gì** sẽ **bị hạn chế 1 ngày**.'
              )
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(CUSTOM_ID.BTN_TICKET_REPORT)
              .setLabel('Báo cáo')
              .setStyle(ButtonStyle.Danger)
          )
      )

      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              lines(
                `### ${ANIMATED_EMOJI.BLUE_DOT} **Góp ý cải thiện**`,
                '-# Dùng khi bạn có một **ý tưởng đề xuất** hoặc **góp ý cải thiện máy chủ** **VNMIXX**.',
                '- **Yêu cầu bắt buộc**',
                '  - **Mô tả rõ ràng** những góp ý, ý tưởng của bạn.',
                '  - Có thể **gửi hình ảnh, biểu đồ** về ý tưởng đó nếu có.',
                '- **Lưu ý**',
                '  - Gửi góp ý **mà không có mục đích gì** sẽ **bị hạn chế 1 ngày**.'
              )
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(CUSTOM_ID.BTN_TICKET_FEEDBACK)
              .setLabel('Góp ý')
              .setStyle(ButtonStyle.Success)
          )
      )

      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              lines(
                `### ${ANIMATED_EMOJI.BLUE_DOT} **Báo lỗi bot**`,
                '-# Dùng khi bạn gặp **lỗi trong quá trình sử dụng bot**.',
                '- **Yêu cầu bắt buộc**',
                '  - **Mô tả rõ ràng lỗi** mà bạn gặp phải.',
                '  - Cung cấp **hình ảnh** và **quá trình từng bước** trước và sau khi gặp lỗi.',
                '- **Lưu ý**',
                '  - **Không tiếp nhận** các lỗi **không liên quan tới bot**.',
                '  - Gửi báo lỗi **mà không có mục đích gì** sẽ **bị hạn chế 1 ngày**.'
              )
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(CUSTOM_ID.BTN_TICKET_BUG)
              .setLabel('Báo lỗi')
              .setStyle(ButtonStyle.Danger)
          )
      )
  }
  private createDonationGuide(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `### ${ANIMATED_EMOJI.WING_LEFT} **NƠI GÓP GẠCH NUÔI BOT** ${ANIMATED_EMOJI.WING_RIGHT}`,
            `-# Tại đây, bạn có thể thực hiện **quyên góp ủng hộ** để **duy trì hoạt động của bot**.`
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Cam kết:**',
            '  - Khoản quyên góp được sử dụng cho **chi phí thuê máy chủ** và các **chi phí phát sinh** cho hoạt động của bot.',
            '  - **Không sử dụng** khoản tiền này cho **mục đích cá nhân** hoặc các **dịch vụ không liên quan đến bot**.',
            '  - Thông tin chuyển khoản được tiếp nhận theo **hình thức ẩn danh**, đảm bảo **không ai biết danh tính người quyên góp** kể cả **Ban Quản lý**.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Lưu ý:**',
            '  - Việc quyên góp **không tạo ra bất kỳ hình thức ưu tiên, đặc quyền hoặc miễn trừ nào** khi xử lý vi phạm nội quy máy chủ **VNMIXX**.',
            `  - <@${env.OWNER_BOT_ID}> chịu **trách nhiệm cá nhân hoàn toàn** về mọi cam kết đối với người quyên góp.`
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Đọc thêm:**',
            '  - [VPS là gì?](https://fptshop.com.vn/tin-tuc/thu-thuat/vps-la-gi-159221)',
            '  - [Tại sao BOT DISCORD cần VPS?](https://chatgpt.com/?q=T%E1%BA%A1i%20sao%20bot%20Discord%20c%E1%BA%A7n%20VPS%3F%20H%C3%A3y%20gi%E1%BA%A3i%20th%C3%ADch%20%C4%91%C6%A1n%20gi%E1%BA%A3n%20cho%20ng%C6%B0%E1%BB%9Di%20kh%C3%B4ng%20bi%E1%BA%BFt%20l%E1%BA%ADp%20tr%C3%ACnh.%20N%E1%BA%BFu%20ch%E1%BA%A1y%20bot%20tr%C3%AAn%20m%C3%A1y%20t%C3%ADnh%20c%C3%A1%20nh%C3%A2n%20th%C3%AC%20s%E1%BA%BD%20c%C3%B3%20v%E1%BA%A5n%20%C4%91%E1%BB%81%20g%C3%AC%20khi%20t%E1%BA%AFt%20m%C3%A1y%2C%20m%E1%BA%A5t%20m%E1%BA%A1ng%20ho%E1%BA%B7c%20m%C3%A1y%20y%E1%BA%BFu%3F%20VPS%20gi%C3%BAp%20bot%20ho%E1%BA%A1t%20%C4%91%E1%BB%99ng%20%E1%BB%95n%20%C4%91%E1%BB%8Bnh%20nh%C6%B0%20th%E1%BA%BF%20n%C3%A0o%20v%C3%A0%20v%C3%AC%20sao%20nhi%E1%BB%81u%20ng%C6%B0%E1%BB%9Di%20ch%E1%BB%8Dn%20d%C3%B9ng%20VPS%20%C4%91%E1%BB%83%20ch%E1%BA%A1y%20bot%20Discord%3F)'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_DONATION_CREATE)
            .setLabel('Quyên góp')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_DONATION_STATS)
            .setLabel('Thống kê')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  }
}
