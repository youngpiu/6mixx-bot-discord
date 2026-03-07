import type { Events, MessageCommandErrorPayload } from '@sapphire/framework'
import { Listener } from '@sapphire/framework'

import { handleError } from '~/utils/errorUtil'

export class MessageCommandErrorListener extends Listener<typeof Events.MessageCommandError> {
  public override async run(error: unknown, { message, command }: MessageCommandErrorPayload) {
    await handleError(message, error, command.name)
  }
}
