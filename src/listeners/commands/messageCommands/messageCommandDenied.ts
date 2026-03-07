import type { Events, MessageCommandDeniedPayload } from '@sapphire/framework'
import { Listener, type UserError } from '@sapphire/framework'

import { handleError } from '~/utils/errorUtil'
import { mapDeniedError } from '~/utils/preconditionErrorUtil'

export class UserEvent extends Listener<typeof Events.MessageCommandDenied> {
  public override async run(error: UserError, { message, command }: MessageCommandDeniedPayload) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(message, mappedError, command.name)
  }
}
