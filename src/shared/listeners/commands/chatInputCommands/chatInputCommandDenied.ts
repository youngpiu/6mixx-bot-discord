import { ApplyOptions } from '@sapphire/decorators'
import type { ChatInputCommandDeniedPayload, Events } from '@sapphire/framework'
import { Listener, type UserError } from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'
import { mapDeniedError } from '~/shared/utils/preconditionErrorUtil'

/**
 * Listener triggered when a chat input (slash) command is denied by a precondition.
 * Maps precondition failures to user-friendly messages and reports them.
 */
@ApplyOptions<Listener.Options>({
  event: 'chatInputCommandDenied'
})
export class UserEvent extends Listener<typeof Events.ChatInputCommandDenied> {
  /**
   * Responds to denied commands by mapping the error and notifying the user.
   *
   * @param error - The UserError indicating why the command was denied.
   * @param context - Context including the interaction and the command.
   */
  public override async run(
    error: UserError,
    { interaction, command }: ChatInputCommandDeniedPayload
  ) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(interaction, mappedError, command.name)
  }
}
