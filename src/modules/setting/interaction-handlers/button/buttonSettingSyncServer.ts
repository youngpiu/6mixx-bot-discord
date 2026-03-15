import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ContainerBuilder
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { env } from '~/shared/config/env'
import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil, MessageUtil } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

type SyncType = 'guides' | 'notifications'

const NOTIFICATION_CONFIGS = [
  {
    threadName: '💌 THÔNG BÁO HỆ THỐNG CONFESSION 💌',
    threadIdKey: 'confessionNotificationThreadId'
  },
  {
    threadName: '💸 THÔNG BÁO HỆ THỐNG QUYÊN GÓP 💸',
    threadIdKey: 'donationNotificationThreadId'
  },
  {
    threadName: '⚠️ THÔNG BÁO LỖI BOT ⚠️',
    threadIdKey: 'errorNotificationThreadId'
  },
  {
    threadName: '🎟️ THÔNG BÁO HỆ THỐNG HỖ TRỢ THÀNH VIÊN 🎟️',
    threadIdKey: 'ticketNotificationThreadId'
  }
] as const

const GUIDE_CONFIGS = [
  {
    threadIdKey: 'confessionTutorialThreadId',
    threadName: '💌 NƠI GỬI CONFESSION 💌',
    generatorButtonId: 'btn-confession-send'
  },
  {
    threadIdKey: 'ticketTutorialThreadId',
    threadName: '🎟️ NƠI GỬI YÊU CẦU HỖ TRỢ 🎟️',
    generatorButtonId: 'btn-ticket-send'
  },
  {
    threadIdKey: 'donationTutorialThreadId',
    threadName: '💝 NƠI GÓP GẠCH NUÔI BOT 💝',
    generatorButtonId: 'btn-donation-send'
  },
  {
    threadIdKey: 'vipTutorialThreadId',
    threadName: '✨ NƠI TUỲ CHỈNH VAI TRÒ ✨',
    generatorButtonId: 'btn-vip-send'
  },
  {
    threadIdKey: 'nmixxTutorialThreadId',
    threadName: '🌟 NƠI ĐĂNG ẢNH NMIXX TỪ TWITTER 🌟',
    generatorButtonId: 'btn-nmixx-forum-send'
  }
] as const

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonSettingSyncServer extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId === CUSTOM_ID.BTN_SETTING_SYNC_GUIDES) {
      return this.some({ syncType: 'guides' as SyncType })
    }
    if (interaction.customId === CUSTOM_ID.BTN_SETTING_SYNC_NOTIFICATIONS) {
      return this.some({ syncType: 'notifications' as SyncType })
    }
    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result || !interaction.guild) return
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const guildConfig = await SettingRepository.find(interaction.guild.id)
    if (!guildConfig) throw new NormalError('Không thể lấy cấu hình máy chủ.')

    if (result.syncType === 'guides') {
      await this.syncGuides(interaction, guildConfig)
      await InteractionUtil.replySuccess(
        interaction,
        'Đã đồng bộ toàn bộ kênh hướng dẫn thành công.'
      )
    } else {
      await this.syncNotifications(interaction, guildConfig)
      await InteractionUtil.replySuccess(
        interaction,
        'Đã đồng bộ toàn bộ kênh thông báo thành công.'
      )
    }
  }

  private async syncGuides(
    interaction: ButtonInteraction,
    guildConfig: NonNullable<Awaited<ReturnType<typeof SettingRepository.find>>>
  ) {
    if (!guildConfig.serviceForumChannelId) {
      throw new NormalError('Kênh dịch vụ chưa được thiết lập.')
    }

    const forumChannel = await interaction
      .guild!.channels.fetch(guildConfig.serviceForumChannelId)
      .catch(() => null)

    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
      throw new NormalError('Kênh dịch vụ không tồn tại hoặc không hợp lệ.')
    }

    for (const config of GUIDE_CONFIGS) {
      const components = this.createGuideMessage(config.generatorButtonId)

      let thread = null
      const oldThreadId = guildConfig[config.threadIdKey]

      if (oldThreadId) {
        try {
          thread = await forumChannel.threads.fetch(oldThreadId)
          if (thread) {
            const firstMessage = await thread.fetchStarterMessage()
            if (firstMessage) {
              await MessageUtil.edit(firstMessage, {
                components: [components],
                flags: ['IsComponentsV2']
              })
            }
          }
        } catch {
          thread = null
        }
      }

      if (!thread) {
        const newThread = await forumChannel.threads.create({
          name: config.threadName,
          message: {
            components: [components],
            flags: ['IsComponentsV2']
          }
        })
        await SettingRepository.update(interaction.guild!.id, {
          [config.threadIdKey]: newThread.id
        })
      }
    }
  }

  private async syncNotifications(
    interaction: ButtonInteraction,
    guildConfig: NonNullable<Awaited<ReturnType<typeof SettingRepository.find>>>
  ) {
    if (!guildConfig.notificationForumChannelId) {
      throw new NormalError('Kênh thông báo chưa được thiết lập.')
    }

    const forumChannel = await interaction
      .guild!.channels.fetch(guildConfig.notificationForumChannelId)
      .catch(() => null)

    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
      throw new NormalError('Kênh thông báo không tồn tại hoặc không hợp lệ.')
    }

    for (const config of NOTIFICATION_CONFIGS) {
      let thread = null
      const oldThreadId = guildConfig[config.threadIdKey]

      if (oldThreadId) {
        try {
          thread = await forumChannel.threads.fetch(oldThreadId)
        } catch {
          thread = null
        }
      }

      if (!thread) {
        const newThread = await forumChannel.threads.create({
          name: config.threadName,
          message: { content: config.threadName }
        })
        await SettingRepository.update(interaction.guild!.id, {
          [config.threadIdKey]: newThread.id
        })
      }
    }
  }

  private createGuideMessage(buttonId: string): ContainerBuilder {
    switch (buttonId) {
      case 'btn-confession-send':
        return this.createConfessionGuide()
      case 'btn-ticket-send':
        return this.createTicketGuide()
      case 'btn-donation-send':
        return this.createDonationGuide()
      case 'btn-vip-send':
        return this.createVipGuide()
      case 'btn-nmixx-forum-send':
        return this.createNmixxGuide()
      default:
        return new ContainerBuilder()
    }
  }

  private createVipGuide(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `### ${ANIMATED_EMOJI.WING_LEFT} **NƠI TUỲ CHỈNH VAI TRÒ** ${ANIMATED_EMOJI.WING_RIGHT}`,
            `-# Tại đây, bạn có thể **tự do thay đổi** các thuộc tính cho **vai trò đặc biệt** của mình.`
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Bạn có thể thay đổi:**',
            '  - **Tên vai trò:** Hiển thị trên danh sách thành viên.',
            '  - **Màu sắc:** Sử dụng mã màu HEX.',
            '  - **Biểu tượng:** Một biểu tượng nhỏ hiển thị ngay cạnh tên của bạn.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Lưu ý:**',
            '  - Tên vai trò không được **vi phạm nội quy** máy chủ.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_VIP_EDIT_NAME)
            .setLabel('Đổi tên')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_VIP_EDIT_COLOR)
            .setLabel('Đổi màu')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_VIP_EDIT_ICON)
            .setLabel('Đổi biểu tượng')
            .setStyle(ButtonStyle.Secondary)
        )
      )
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
            '  - Mọi confession được gửi **ẩn danh** sẽ **không tiết lộ danh tính người gửi** cho bất kỳ ai, kể cả **Ban quản lý**.'
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
            `### ${ANIMATED_EMOJI.WING_LEFT} **NƠI GỬI YÊU CẦU HỖ TRỢ** ${ANIMATED_EMOJI.WING_RIGHT}`,
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
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_DISBURSEMENT_LIST)
            .setLabel('Danh sách các khoản chi')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  }

  private createNmixxGuide(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          `### 🌟 **NƠI ĐĂNG ẢNH NMIXX TỪ TWITTER**\n` +
            `Chào mừng bạn! Tại đây bạn có thể chia sẻ những tấm ảnh lung linh của NMIXX từ Twitter/X vào các kênh Forum tương ứng.\n\n` +
            `- **Đăng ảnh đơn**: Dành cho bài viết chỉ có một thành viên.\n` +
            `- **Đăng ảnh OTP**: Dành cho các cặp đôi hoặc nhóm thành viên.`
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_NMIXX_POST_SINGLE)
            .setLabel('Đăng ảnh đơn')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_NMIXX_POST_OTP)
            .setLabel('Đăng ảnh OTP')
            .setStyle(ButtonStyle.Success)
        )
      )
  }
}
