import { ApplyOptions } from '@sapphire/decorators'
import type { ChatInputCommandErrorPayload } from '@sapphire/framework'
import { Events, Listener } from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'

/**
 * Listener triggered when a chat input (slash) command encounters an unhandled exception during execution.
 * Reports the error using the centralized `handleError` utility.
 */
@ApplyOptions<Listener.Options>({
  event: Events.ChatInputCommandError
})
export class ChatInputCommandErrorListener extends Listener<
  typeof Events.ChatInputCommandError
> {
  /**
   * Responds to command execution errors by notifying the user.
   *
   * @param error - The caught error object.
   * @param context - Context including the interaction and the command name.
   */
  public override async run(
    error: unknown,
    { interaction, command }: ChatInputCommandErrorPayload
  ) {
    await handleError(interaction, error, command.name)
  }
}
