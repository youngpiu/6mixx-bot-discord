import { ApplyOptions } from '@sapphire/decorators'
import {
  Events,
  type InteractionHandlerError,
  Listener
} from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'

@ApplyOptions<Listener.Options>({
  event: Events.InteractionHandlerError
})
export class InteractionHandlerErrorListener extends Listener<
  typeof Events.InteractionHandlerError
> {
  public override async run(
    error: unknown,
    { interaction, handler }: InteractionHandlerError
  ) {
    if (!interaction || !interaction.isRepliable()) return

    await handleError(interaction, error, handler.name)
  }
}
