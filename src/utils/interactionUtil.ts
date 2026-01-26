import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'

const deleteTimers = new Map<string, NodeJS.Timeout>()

export const deleteReplyInteraction = async (
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | ModalSubmitInteraction
    | StringSelectMenuInteraction,
  seconds: number = 10
): Promise<void> => {
  // Logic xác định ID chung để debounce (ưu tiên ID của interaction gốc tạo ra message)
  // Nếu là Button/Select (có message), message.interaction.id trỏ về CMD gốc
  // Nếu CMD, dùng interaction.id
  const messageId =
    'message' in interaction && interaction.message
      ? interaction.message.interactionMetadata?.id
      : undefined

  const id = messageId || interaction.id

  // Clear timer cũ nếu có (quan trọng để reset hoặc hủy nếu seconds <= 0)
  if (deleteTimers.has(id)) {
    clearTimeout(deleteTimers.get(id))
    deleteTimers.delete(id)
  }

  // Nếu seconds <= 0, chỉ hủy timer cũ (nếu có) rồi return
  if (seconds <= 0) return

  // Set timer mới
  const timeout = setTimeout(async () => {
    try {
      // deleteReply() hoạt động cho cả CMD ban đầu và các Button Interaction (đã update message)
      await interaction.deleteReply()
    } catch {
      // Ignore errors
    } finally {
      // Chỉ xóa nếu timer hiện tại trong map chính là timer này
      // (Tránh trường hợp timer mới đã được set trong khi timer này đang chạy await)
      if (deleteTimers.get(id) === timeout) {
        deleteTimers.delete(id)
      }
    }
  }, seconds * 1000)

  deleteTimers.set(id, timeout)
}
