import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction, ChannelType } from 'discord.js'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { NormalError } from '~/core/errorResponse'

const NOTIFICATION_THREAD_CONFIG = {
  [CUSTOM_ID.BTN_CONFESSION_CREATE_NOTIFICATION_THREAD]: {
    threadName: '💌 THÔNG BÁO HỆ THỐNG CONFESSION 💌',
    threadIdKey: 'confessionNotificationThreadId',
    successMessage: 'Kênh thông báo cho hệ thống confession đã được tạo'
  },
  [CUSTOM_ID.BTN_DONATION_CREATE_NOTIFICATION_THREAD]: {
    threadName: '💸 THÔNG BÁO HỆ THỐNG QUYÊN GÓP 💸',
    threadIdKey: 'donationNotificationThreadId',
    successMessage: 'Kênh thông báo cho hệ thống quyên góp đã được tạo'
  },
  [CUSTOM_ID.BTN_GENERAL_CREATE_ERROR_NOTIFICATION_THREAD]: {
    threadName: '⚠️ THÔNG BÁO LỖI BOT ⚠️',
    threadIdKey: 'errorNotificationThreadId',
    successMessage: 'Kênh thông báo lỗi bot đã được tạo'
  },
  [CUSTOM_ID.BTN_TICKET_CREATE_NOTIFICATION_THREAD]: {
    threadName: '🎟️ THÔNG BÁO HỆ THỐNG HỖ TRỢ THÀNH VIÊN 🎟️',
    threadIdKey: 'ticketNotificationThreadId',
    successMessage: 'Kênh thông báo cho hệ thống hỗ trợ thành viên đã được tạo'
  }
} as const

type NotificationButtonId = keyof typeof NOTIFICATION_THREAD_CONFIG
type ThreadIdKey =
  (typeof NOTIFICATION_THREAD_CONFIG)[NotificationButtonId]['threadIdKey']

export class ButtonCreateNotificationThread extends InteractionHandler {
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
    if (!(interaction.customId in NOTIFICATION_THREAD_CONFIG))
      return this.none()
    return this.some({ buttonId: interaction.customId as NotificationButtonId })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction || !interaction.guild) return

    const { buttonId } = result
    const { threadName, threadIdKey, successMessage } =
      NOTIFICATION_THREAD_CONFIG[buttonId]

    const config = await GuildRepository.findUnique(interaction.guild.id)
    const forumChannelId = config?.notificationForumChannelId

    // 1. Kiểm tra kênh diễn đàn thông báo
    const forumChannel = forumChannelId
      ? await interaction.guild.channels.fetch(forumChannelId).catch(() => null)
      : null

    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
      throw new NormalError(
        'Kênh diễn đàn thông báo chưa được thiết lập hoặc không hợp lệ.'
      )
    }

    // 2. Kiểm tra xem thread cũ còn tồn tại không
    const oldThreadId = config?.[threadIdKey as ThreadIdKey]
    if (oldThreadId) {
      const oldThread = await forumChannel.threads
        .fetch(oldThreadId)
        .catch(() => null)
      if (oldThread) {
        throw new NormalError(
          `Kênh thông báo này đã tồn tại: <#${oldThread.id}>.`
        )
      }
    }

    // 3. Tạo thread mới
    const thread = await forumChannel.threads.create({
      name: threadName,
      message: { content: threadName }
    })

    await GuildRepository.update(interaction.guild.id, {
      [threadIdKey]: thread.id
    })

    return InteractionUtil.replySuccess(
      interaction,
      `${successMessage}: <#${thread.id}>.`
    )
  }
}
