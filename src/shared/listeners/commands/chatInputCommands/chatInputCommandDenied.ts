// Listener executed when a chat input command is denied due to precondition failures
import type { ChatInputCommandDeniedPayload, Events } from '@sapphire/framework'
import { Listener, type UserError } from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'
import { mapDeniedError } from '~/shared/utils/preconditionErrorUtil'

export class UserEvent extends Listener<typeof Events.ChatInputCommandDenied> {
  public override async run(
    error: UserError,
    { interaction, command }: ChatInputCommandDeniedPayload
  ) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(interaction, mappedError, command.name)
  }
}
