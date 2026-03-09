import type {
  ContextMenuCommandDeniedPayload,
  Events
} from '@sapphire/framework'
import { Listener, type UserError } from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'
import type { RepliableInteraction } from '~/shared/utils/messageUtil'
import { mapDeniedError } from '~/shared/utils/preconditionErrorUtil'

export class UserEvent extends Listener<
  typeof Events.ContextMenuCommandDenied
> {
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
