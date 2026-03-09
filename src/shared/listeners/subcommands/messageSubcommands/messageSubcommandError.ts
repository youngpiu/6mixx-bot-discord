import { Listener } from '@sapphire/framework'
import {
  type MessageSubcommandErrorPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'
import { handleError } from '~/shared/utils/errorUtil'

export class MessageSubcommandErrorListener extends Listener<
  typeof SubcommandPluginEvents.MessageSubcommandError
> {
  public override async run(
    error: unknown,
    { message, command }: MessageSubcommandErrorPayload
  ) {
    await handleError(message, error, command.name)
  }
}
