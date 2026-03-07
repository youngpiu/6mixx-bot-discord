import { Listener, type UserError } from '@sapphire/framework'
import {
  type MessageSubcommandDeniedPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'

import { handleError } from '~/utils/errorUtil'
import { mapDeniedError } from '~/utils/preconditionErrorUtil'

export class UserEvent extends Listener<typeof SubcommandPluginEvents.MessageSubcommandDenied> {
  public override async run(
    error: UserError,
    { message, command }: MessageSubcommandDeniedPayload
  ) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(message, mappedError, command.name)
  }
}
