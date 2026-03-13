import { ApplyOptions } from '@sapphire/decorators'
import type { ContextMenuCommandErrorPayload } from '@sapphire/framework'
import { Events, Listener } from '@sapphire/framework'
import type { RepliableInteraction } from 'discord.js'

import { handleError } from '~/shared/utils/errorUtil'

/**
 * Listener triggered when a context menu command encounters an error during execution.
 * Reports the error using the centralized `handleError` utility.
 */
@ApplyOptions<Listener.Options>({
  event: Events.ContextMenuCommandError
})
export class ContextMenuCommandErrorListener extends Listener<
  typeof Events.ContextMenuCommandError
> {
  /**
   * Responds to context menu command execution errors by notifying the user.
   *
   * @param error - The caught error object.
   * @param context - Context including the interaction and the command name.
   */
  public override async run(
    error: unknown,
    { interaction, command }: ContextMenuCommandErrorPayload
  ) {
    const repliable = interaction as unknown as RepliableInteraction

    await handleError(repliable, error, command.name)
  }
}
