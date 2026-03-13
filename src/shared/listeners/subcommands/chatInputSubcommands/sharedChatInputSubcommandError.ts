import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import {
  type ChatInputSubcommandErrorPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'

import { handleError } from '~/shared/utils/errorUtil'

/**
 * Listener triggered when a chat input subcommand encounters an error during execution.
 * Reports the error using the centralized `handleError` utility.
 */
@ApplyOptions<Listener.Options>({
  event: SubcommandPluginEvents.ChatInputSubcommandError
})
export class ChatInputSubcommandErrorListener extends Listener<
  typeof SubcommandPluginEvents.ChatInputSubcommandError
> {
  /**
   * Responds to subcommand execution errors by notifying the user.
   *
   * @param error - The caught error object.
   * @param context - Context including the interaction and the command name.
   */
  public override async run(
    error: unknown,
    { interaction, command }: ChatInputSubcommandErrorPayload
  ) {
    await handleError(interaction, error, command.name)
  }
}
