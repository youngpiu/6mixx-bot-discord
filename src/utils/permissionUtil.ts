import { ButtonInteraction, Message, PermissionFlagsBits } from 'discord.js'

export const hasAdministratorPermission = ({
  interaction,
  message
}: {
  interaction?: ButtonInteraction
  message?: Message
}) => {
  if (interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  }
  if (message) {
    return message.member?.permissions.has(PermissionFlagsBits.Administrator)
  }
  return false
}
