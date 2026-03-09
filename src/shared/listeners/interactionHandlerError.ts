import type { Events, InteractionHandlerError } from '@sapphire/framework'
import { Listener } from '@sapphire/framework'
import { handleError } from '~/shared/utils/errorUtil'

export class InteractionHandlerErrorListener extends Listener<
  typeof Events.InteractionHandlerError
> {
  public override async run(error: unknown, { interaction, handler }: InteractionHandlerError) {
    if (!interaction || !interaction.isRepliable()) return

    await handleError(interaction, error, handler.name)
  }
}
