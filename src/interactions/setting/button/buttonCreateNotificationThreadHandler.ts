import { container } from '@sapphire/framework'
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ChannelType, ForumChannel } from 'discord.js'

import { BadRequestError, GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'

const NOTIFICATION_THREAD_CONFIG = {
  'btn-confession-create-notification-thread': {
    threadName: '💌 THÔNG BÁO CONFESSION 💌',
    threadIdKey: 'confessionNotificationThreadId',
    successMessage: 'Kênh thông báo confession đã được tạo'
  },
  'btn-donation-create-notification-thread': {
    threadName: '💸 THÔNG BÁO QUYÊN GÓP 💸',
    threadIdKey: 'donationNotificationThreadId',
    successMessage: 'Kênh thông báo quyên góp đã được tạo'
  },
  'btn-general-create-error-notification-thread': {
    threadName: '⚠️ THÔNG BÁO LỖI BOT ⚠️',
    threadIdKey: 'errorNotificationThreadId',
    successMessage: 'Kênh thông báo lỗi đã được tạo'
  },
  'btn-ticket-create-notification-thread': {
    threadName: '🎟️ THÔNG BÁO HỖ TRỢ 🎟️',
    threadIdKey: 'ticketNotificationThreadId',
    successMessage: 'Kênh thông báo hỗ trợ đã được tạo'
  }
} as const

type NotificationButtonId = keyof typeof NOTIFICATION_THREAD_CONFIG
type ThreadIdKey = (typeof NOTIFICATION_THREAD_CONFIG)[NotificationButtonId]['threadIdKey']

export class ButtonCreateNotificationThreadHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!(interaction.customId in NOTIFICATION_THREAD_CONFIG)) return this.none()
    return this.some({ buttonId: interaction.customId as NotificationButtonId })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { buttonId: NotificationButtonId }>(
    async (interaction, result) => {
      if (!result) return

      const { threadName, threadIdKey, successMessage } =
        NOTIFICATION_THREAD_CONFIG[result.buttonId]

      if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()
      await interaction.deferReply({ flags: ['Ephemeral'] })

      const config = await GuildRepository.getGuild(interaction.guildId)
      const notificationChannelId = config?.notificationForumChannelId

      if (!notificationChannelId)
        throw new BadRequestError({ description: 'Kênh thông báo chưa được thiết lập.' })

      const notificationChannel = await interaction.guild.channels.fetch(notificationChannelId)
      if (!notificationChannel)
        throw new BadRequestError({ description: 'Kênh thông báo chưa được thiết lập.' })

      if (notificationChannel.type !== ChannelType.GuildForum) {
        throw new BadRequestError({
          description: 'Kênh thông báo phải là kênh diễn đàn.'
        })
      }

      const channel = notificationChannel as ForumChannel

      const oldThreadId = config?.[threadIdKey as ThreadIdKey]
      if (oldThreadId) {
        try {
          const oldThread = await channel.threads.fetch(oldThreadId)
          if (oldThread) await oldThread.delete()
        } catch (error) {
          container.logger.error(error)
        }
      }

      const thread = await channel.threads.create({
        name: threadName,
        message: { content: threadName }
      })

      await GuildRepository.updateConfig(interaction.guildId, {
        [threadIdKey]: thread.id
      })

      await interaction.editReply({
        embeds: [
          createSuccessEmbed({
            description: `${successMessage}: <#${thread.id}>`
          })
        ]
      })
      await deleteReplyInteraction(interaction)
    }
  )
}
