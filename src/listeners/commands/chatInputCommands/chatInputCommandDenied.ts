import type { ChatInputCommandDeniedPayload, Events } from '@sapphire/framework'
import { Listener, UserError } from '@sapphire/framework'

import { createErrorEmbed } from '~/utils/embedUtil'

export class UserEvent extends Listener<typeof Events.ChatInputCommandDenied> {
  public override async run(
    { context }: UserError,
    { interaction }: ChatInputCommandDeniedPayload
  ) {
    if (Reflect.get(Object(context), 'silent')) return

    const ctx = context as ErrorContext
    const errorEmbed = createErrorEmbed({
      title: ctx.title,
      description: ctx.description
    })

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        embeds: [errorEmbed],
        allowedMentions: { users: [interaction.user.id], roles: [] }
      })
    }

    return interaction.reply({
      embeds: [errorEmbed],
      allowedMentions: { users: [interaction.user.id], roles: [] },
      flags: ['Ephemeral']
    })
  }
}
