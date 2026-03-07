import type { Events, InteractionHandlerError } from '@sapphire/framework'
import { Listener } from '@sapphire/framework'
import { type RepliableInteraction } from 'discord.js'

import { handleError } from '~/utils/errorUtil'

export class InteractionHandlerErrorListener extends Listener<
  typeof Events.InteractionHandlerError
> {
  public override async run(error: unknown, { interaction, handler }: InteractionHandlerError) {
    const repliable = interaction as RepliableInteraction

    if (!repliable || !repliable.isRepliable()) return

    await handleError(repliable, error, handler.name)
  }
}
