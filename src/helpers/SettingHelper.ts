import { container } from '@sapphire/pieces'
import { ButtonInteraction, ChannelType, TextChannel } from 'discord.js'

import { BadRequestError, GuildOnlyError } from '~/core/errorResponse'

import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'

type CreateNotificationThreadOptions = {
  interaction: ButtonInteraction
  threadName: string
  oldThreadIdKey:
    | 'ticketNotificationThreadId'
    | 'donationNotificationThreadId'
    | 'confessionNotificationThreadId'
  updateKey:
    | 'ticketNotificationThreadId'
    | 'donationNotificationThreadId'
    | 'confessionNotificationThreadId'
  successMessage: string
}

/**
 * Tạo thread thông báo trong kênh thông báo
 * - Kiểm tra kênh thông báo đã cài đặt chưa
 * - Xóa thread cũ nếu có
 * - Tạo thread mới
 * - Lưu thread ID vào database
 */
export async function createNotificationThread(options: CreateNotificationThreadOptions) {
  const { interaction, threadName, oldThreadIdKey, updateKey, successMessage } = options

  if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()

  const config = await GuildRepository.getGuild(interaction.guildId)
  const notificationChannelId = config?.notificationChannelId

  if (!notificationChannelId)
    throw new BadRequestError({ description: 'Kênh thông báo chưa được cài đặt.' })

  const notificationChannel = interaction.guild.channels.cache.get(notificationChannelId)
  if (!notificationChannel || notificationChannel.type !== ChannelType.GuildText)
    throw new BadRequestError({
      description:
        'Kênh thông báo không tồn tại hoặc không phải là kênh văn bản, vui lòng cài đặt lại.'
    })

  const textChannel = notificationChannel as TextChannel

  const oldThreadId = config?.[oldThreadIdKey]
  if (oldThreadId) {
    try {
      const oldThread = textChannel.threads.cache.get(oldThreadId)
      if (oldThread) await oldThread.delete()
    } catch (error) {
      if (error instanceof Error) {
        container.logger.error(error)
      }
    }
  }

  const thread = await textChannel.threads.create({
    name: threadName,
    type: ChannelType.PublicThread
  })

  await GuildRepository.updateConfig(interaction.guildId, {
    [updateKey]: thread.id
  })

  await interaction.reply({
    embeds: [
      createSuccessEmbed({
        description: `${successMessage}: <#${thread.id}>`
      })
    ],
    flags: ['Ephemeral']
  })
  await deleteReplyInteraction(interaction)
}
