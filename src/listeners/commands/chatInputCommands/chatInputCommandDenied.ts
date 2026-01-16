import type { ChatInputCommandDeniedPayload, Events } from '@sapphire/framework'
import { Listener, UserError } from '@sapphire/framework'
import { MessageFlags } from 'discord.js'
import { ERROR_MESSAGE } from '~/constants/message.constant'
import { createErrorEmbed } from '~/utils/embed.util'

export class UserEvent extends Listener<typeof Events.ChatInputCommandDenied> {
  public override async run(
    { context, message: errorMessage }: UserError,
    { interaction }: ChatInputCommandDeniedPayload
  ) {
    if (Reflect.get(Object(context), 'silent')) return

    const errorEmbed = createErrorEmbed(
      ERROR_MESSAGE.NO_PERMISSION.TITLE,
      errorMessage
    )

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        embeds: [errorEmbed],
        allowedMentions: { users: [interaction.user.id], roles: [] }
      })
    }

    return interaction.reply({
      embeds: [errorEmbed],
      allowedMentions: { users: [interaction.user.id], roles: [] },
      flags: MessageFlags.Ephemeral
    })
  }
}
