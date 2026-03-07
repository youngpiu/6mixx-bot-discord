import type { ChatInputCommandErrorPayload, Events } from '@sapphire/framework'
import { Listener } from '@sapphire/framework'

import { handleError } from '~/utils/errorUtil'

export class ChatInputCommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
  public override async run(
    error: unknown,
    { interaction, command }: ChatInputCommandErrorPayload
  ) {
    await handleError(interaction, error, command.name)
  }
}
