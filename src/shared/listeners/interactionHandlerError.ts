import { ApplyOptions } from '@sapphire/decorators'
import {
  Events,
  type InteractionHandlerError,
  Listener
} from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'

/**
 * Listener triggered when an error occurs within an interaction handler (e.g., buttons, modals).
 * Delegates error reporting to the centralized `handleError` utility.
 */
@ApplyOptions<Listener.Options>({
  event: Events.InteractionHandlerError
})
export class InteractionHandlerErrorListener extends Listener<
  typeof Events.InteractionHandlerError
> {
  /**
   * Responds to interaction handler errors by notifying the user.
   *
   * @param error - The caught error object.
   * @param context - Context including the interaction and the handler name.
   */
  public override async run(
    error: unknown,
    { interaction, handler }: InteractionHandlerError
  ) {
    if (!interaction || !interaction.isRepliable()) return

    await handleError(interaction, error, handler.name)
  }
}
