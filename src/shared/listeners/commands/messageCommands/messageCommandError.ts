import { ApplyOptions } from '@sapphire/decorators'
import type { Events, MessageCommandErrorPayload } from '@sapphire/framework'
import { Listener } from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'

/**
 * Listener triggered when a message-based command encounters an error during execution.
 * Reports the error using the centralized `handleError` utility.
 */
@ApplyOptions<Listener.Options>({
  event: 'messageCommandError'
})
export class MessageCommandErrorListener extends Listener<
  typeof Events.MessageCommandError
> {
  /**
   * Responds to message command execution errors by notifying the user.
   *
   * @param error - The caught error object.
   * @param context - Context including the message and the command name.
   */
  public override async run(
    error: unknown,
    { message, command }: MessageCommandErrorPayload
  ) {
    await handleError(message, error, command.name)
  }
}
