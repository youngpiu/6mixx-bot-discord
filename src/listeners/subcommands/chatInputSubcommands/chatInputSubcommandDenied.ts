import {
  SubcommandPluginEvents,
  type ChatInputSubcommandDeniedPayload
} from '@sapphire/plugin-subcommands'
import { Listener, type UserError } from '@sapphire/framework'
import { createErrorEmbed } from '~/utils/embedUtil'

export class UserEvent extends Listener<typeof SubcommandPluginEvents.ChatInputSubcommandDenied> {
  public override async run(
    { context }: UserError,
    { interaction }: ChatInputSubcommandDeniedPayload
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
