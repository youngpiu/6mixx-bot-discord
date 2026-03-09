import type { ContextMenuCommandErrorPayload, Events } from '@sapphire/framework'
import { Listener } from '@sapphire/framework'
import type { RepliableInteraction } from 'discord.js'

import { handleError } from '~/shared/utils/errorUtil'

export class ContextMenuCommandErrorListener extends Listener<
  typeof Events.ContextMenuCommandError
> {
  public override async run(
    error: unknown,
    { interaction, command }: ContextMenuCommandErrorPayload
  ) {
    const repliable = interaction as unknown as RepliableInteraction

    await handleError(repliable, error, command.name)
  }
}
