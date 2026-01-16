import type {
  ContextMenuCommandDeniedPayload,
  Events
} from '@sapphire/framework'
import { Listener, UserError } from '@sapphire/framework'
import { MessageFlags } from 'discord.js'
import { ERROR_MESSAGE } from '~/constants/messages'
import { createErrorEmbed } from '~/utils/embed'

export class UserEvent extends Listener<
  typeof Events.ContextMenuCommandDenied
> {
  public override async run(
    { context, message: errorMessage }: UserError,
    { interaction }: ContextMenuCommandDeniedPayload
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
