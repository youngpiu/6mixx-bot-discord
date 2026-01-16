import {
  SubcommandPluginEvents,
  type MessageSubcommandDeniedPayload
} from '@sapphire/plugin-subcommands'
import { Listener, type UserError } from '@sapphire/framework'
import { ERROR_MESSAGE } from '~/constants/message.constant'
import { createErrorEmbed } from '~/utils/embed.util'

export class UserEvent extends Listener<
  typeof SubcommandPluginEvents.MessageSubcommandDenied
> {
  public override async run(
    { context, message: errorMessage }: UserError,
    { message }: MessageSubcommandDeniedPayload
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
