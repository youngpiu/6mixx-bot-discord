import { ApplyOptions } from '@sapphire/decorators'
import {
  Listener,
  LogLevel,
  type MessageCommandSuccessPayload
} from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import type { Logger } from '@sapphire/plugin-logger'

import { logSuccessCommand } from '~/shared/utils/loggerUtil'

@ApplyOptions<Listener.Options>({
  enabled: (container.logger as Logger).level <= LogLevel.Debug
})
export class UserEvent extends Listener {
  public override run(payload: MessageCommandSuccessPayload) {
    logSuccessCommand(payload)
  }
}
