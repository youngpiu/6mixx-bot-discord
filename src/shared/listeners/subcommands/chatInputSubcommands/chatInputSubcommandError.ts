import { Listener } from '@sapphire/framework'
import {
  type ChatInputSubcommandErrorPayload,
  SubcommandPluginEvents
} from '@sapphire/plugin-subcommands'
import { handleError } from '~/shared/utils/errorUtil'

export class ChatInputSubcommandErrorListener extends Listener<
  typeof SubcommandPluginEvents.ChatInputSubcommandError
> {
  public override async run(
    error: unknown,
    { interaction, command }: ChatInputSubcommandErrorPayload
  ) {
    await handleError(interaction, error, command.name)
  }
}
