import type { Events, MessageCommandDeniedPayload } from '@sapphire/framework'
import { Listener, type UserError } from '@sapphire/framework'

import { createErrorEmbed } from '~/utils/embedUtil'

export class UserEvent extends Listener<typeof Events.MessageCommandDenied> {
  public override async run({ context }: UserError, { message }: MessageCommandDeniedPayload) {
    if (Reflect.get(Object(context), 'silent')) return

    const ctx = context as ErrorContext
    const errorEmbed = createErrorEmbed({
      title: ctx.title,
      description: ctx.description
    })

    return message.reply({
      embeds: [errorEmbed],
      allowedMentions: { users: [message.author.id], roles: [] }
    })
  }
}
