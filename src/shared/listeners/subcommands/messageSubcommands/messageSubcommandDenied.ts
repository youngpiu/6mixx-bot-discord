import { ApplyOptions } from '@sapphire/decorators'
import { Listener, type UserError } from '@sapphire/framework'
import {
  type MessageSubcommandDeniedPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'

import { handleError } from '~/shared/utils/errorUtil'
import { mapDeniedError } from '~/shared/utils/preconditionErrorUtil'

/**
 * Listener triggered when a message-based subcommand is denied by a precondition.
 * Maps precondition failures to user-friendly messages and reports them.
 */
@ApplyOptions<Listener.Options>({
  event: SubcommandPluginEvents.MessageSubcommandDenied
})
export class UserEvent extends Listener<
  typeof SubcommandPluginEvents.MessageSubcommandDenied
> {
  /**
   * Responds to denied message subcommands by mapping the error and notifying the user.
   *
   * @param error - The UserError indicating why the subcommand was denied.
   * @param context - Context including the message and the command.
   */
  public override async run(
    error: UserError,
    { message, command }: MessageSubcommandDeniedPayload
  ) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(message, mappedError, command.name)
  }
}
