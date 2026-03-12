import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import {
  type MessageSubcommandErrorPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'

import { handleError } from '~/shared/utils/errorUtil'

@ApplyOptions<Listener.Options>({
  event: SubcommandPluginEvents.MessageSubcommandError
})
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
