import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'

export const deleteReplyInteraction = async (
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | ModalSubmitInteraction
    | StringSelectMenuInteraction,
  seconds: number = 10
): Promise<void> => {
  if (seconds <= 0) return interaction.deleteReply()
  setTimeout(async () => {
    try {
      await interaction.deleteReply()
    } catch {}
  }, seconds * 1000)
}
