import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import {
  type MessageSubcommandErrorPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'

import { handleError } from '~/shared/utils/errorUtil'

/**
 * Listener triggered when a message-based subcommand encounters an error during execution.
 * Reports the error using the centralized `handleError` utility.
 */
@ApplyOptions<Listener.Options>({
  event: SubcommandPluginEvents.MessageSubcommandError
})
export class MessageSubcommandErrorListener extends Listener<
  typeof SubcommandPluginEvents.MessageSubcommandError
> {
  /**
   * Responds to message subcommand execution errors by notifying the user.
   *
   * @param error - The caught error object.
   * @param context - Context including the message and the command name.
   */
  public override async run(
    error: unknown,
    { message, command }: MessageSubcommandErrorPayload
  ) {
    await handleError(message, error, command.name)
  }
}
