import { ApplyOptions } from '@sapphire/decorators'
import {
  Events,
  Listener,
  type ListenerErrorPayload
} from '@sapphire/framework'

import { handleError } from '~/shared/utils/errorUtil'

@ApplyOptions<Listener.Options>({
  event: Events.ListenerError
})
export class ListenerErrorListener extends Listener<
  typeof Events.ListenerError
> {
  public override async run(error: unknown, { piece }: ListenerErrorPayload) {
    await handleError(null, error, piece.name)
  }
}
