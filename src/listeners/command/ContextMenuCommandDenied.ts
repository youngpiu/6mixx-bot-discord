import {
  Events,
  Listener,
  type ContextMenuCommandDeniedPayload,
  type UserError
} from '@sapphire/framework'
import { MessageFlags } from 'discord.js'

export class ContextMenuCommandDenied extends Listener<
  typeof Events.ContextMenuCommandDenied
> {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ContextMenuCommandDenied
    })
  }

  public run(
    error: UserError,
    { interaction }: ContextMenuCommandDeniedPayload
  ) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        content: error.message
      })
    }

    return interaction.reply({
      content: error.message,
      flags: MessageFlags.Ephemeral
    })
  }
}
