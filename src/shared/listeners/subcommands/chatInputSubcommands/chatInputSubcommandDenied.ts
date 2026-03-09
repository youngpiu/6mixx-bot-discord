import { Listener, type UserError } from '@sapphire/framework'
import {
  type ChatInputSubcommandDeniedPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'

import { handleError } from '~/shared/utils/errorUtil'
import { mapDeniedError } from '~/shared/utils/preconditionErrorUtil'

export class UserEvent extends Listener<
  typeof SubcommandPluginEvents.ChatInputSubcommandDenied
> {
  public override async run(
    error: UserError,
    { interaction, command }: ChatInputSubcommandDeniedPayload
  ) {
    if (Reflect.get(Object(error.context), 'silent')) return

    const mappedError = mapDeniedError(error)
    return handleError(interaction, mappedError, command.name)
  }
}
