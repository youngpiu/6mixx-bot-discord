import { ApplyOptions } from '@sapphire/decorators'
import {
  Events,
  Listener,
  type ListenerErrorPayload
} from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'

/**
 * Listener triggered when an error occurs within another listener.
 * Logs the error to standard channels but cannot reply to an interaction (passed as null).
 */
@ApplyOptions<Listener.Options>({
  event: Events.ListenerError
})
export class SharedListenerErrorListener extends Listener<
  typeof Events.ListenerError
> {
  /**
   * Handles errors occurring in listeners by logging them.
   *
   * @param error - The caught error object.
   * @param context - Context including the listener piece that errored.
   */
  public override async run(error: unknown, { piece }: ListenerErrorPayload) {
    await handleError(null, error, piece.name)
  }
}
