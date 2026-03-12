import { ApplyOptions } from '@sapphire/decorators'
import type { Events, MessageCommandDeniedPayload } from '@sapphire/framework'
import { Listener, type UserError } from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'
import { mapDeniedError } from '~/shared/utils/preconditionErrorUtil'

/**
 * Listener triggered when a message-based command is denied by a precondition.
 * Maps precondition failures to user-friendly messages and reports them.
 */
@ApplyOptions<Listener.Options>({
  event: 'messageCommandDenied'
})
export class UserEvent extends Listener<typeof Events.MessageCommandDenied> {
  /**
   * Responds to denied message commands by mapping the error and notifying the user.
   *
   * @param error - The UserError indicating why the command was denied.
   * @param context - Context including the message and the command.
   */
  public override async run(
    error: UserError,
    { message, command }: MessageCommandDeniedPayload
  ) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(message, mappedError, command.name)
  }
}
