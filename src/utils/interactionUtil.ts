import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

const deleteTimers = new Map<string, NodeJS.Timeout>()

export const deleteReplyInteraction = async (
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | ModalSubmitInteraction
    | StringSelectMenuInteraction,
  seconds: number = DELETE_REPLY_TIMEOUT.VERY_SHORT
): Promise<void> => {
  const messageId =
    'message' in interaction && interaction.message
      ? interaction.message.interactionMetadata?.id
      : undefined

  const id = messageId || interaction.id

  if (deleteTimers.has(id)) {
    clearTimeout(deleteTimers.get(id))
    deleteTimers.delete(id)
  }

  if (seconds <= 0) return interaction.deleteReply().catch(() => {})

  const timeout = setTimeout(async () => {
    try {
      await interaction.deleteReply().catch(() => {})
    } catch {
      // Ignore errors
    } finally {
      if (deleteTimers.get(id) === timeout) {
        deleteTimers.delete(id)
      }
    }
  }, seconds * 1000)

  deleteTimers.set(id, timeout)
}

export const checkDmPermission = async (
  interaction: ButtonInteraction | ChatInputCommandInteraction
): Promise<boolean> => {
  try {
    const dmChannel = await interaction.user.createDM()
    // Try to send a silent test message
    const msg = await dmChannel.send({
      content: 'Bot kiểm tra quyền gửi tin nhắn riêng...',
      flags: ['SuppressNotifications']
    })
    // Delete it immediately
    await msg.delete().catch(() => {})
    return true
  } catch {
    return false
  }
}
