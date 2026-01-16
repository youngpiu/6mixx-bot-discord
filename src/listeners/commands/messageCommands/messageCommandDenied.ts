import type { Events, MessageCommandDeniedPayload } from '@sapphire/framework'
import { Listener, type UserError } from '@sapphire/framework'
import { ERROR_MESSAGE } from '~/constants/messages'
import { createErrorEmbed } from '~/utils/embed'

export class UserEvent extends Listener<typeof Events.MessageCommandDenied> {
  public override async run(
    { context, message: errorMessage }: UserError,
    { message }: MessageCommandDeniedPayload
  ) {
    if (Reflect.get(Object(context), 'silent')) return

    const errorEmbed = createErrorEmbed(
      ERROR_MESSAGE.NO_PERMISSION.TITLE,
      errorMessage
    )

    return message.reply({
      embeds: [errorEmbed],
      allowedMentions: { users: [message.author.id], roles: [] }
    })
  }
}
