import { ApplyOptions } from '@sapphire/decorators'
import type { ContextMenuCommandDeniedPayload } from '@sapphire/framework'
import { Events, Listener, type UserError } from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'
import type { RepliableInteraction } from '~/shared/utils/messageUtil'
import { mapDeniedError } from '~/shared/utils/preconditionErrorUtil'

/**
 * Listener triggered when a context menu command is denied by a precondition.
 * Maps precondition failures to user-friendly messages and reports them.
 */
@ApplyOptions<Listener.Options>({
  event: Events.ContextMenuCommandDenied
})
export class ContextMenuCommandDeniedListener extends Listener<
  typeof Events.ContextMenuCommandDenied
> {
  /**
   * Responds to denied context menu commands by mapping the error and notifying the user.
   *
   * @param error - The UserError indicating why the command was denied.
   * @param context - Context including the interaction and the command.
   */
  public override async run(
    error: UserError,
    { interaction, command }: ContextMenuCommandDeniedPayload
  ) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(
      interaction as RepliableInteraction,
      mappedError,
      command.name
    )
  }
}
