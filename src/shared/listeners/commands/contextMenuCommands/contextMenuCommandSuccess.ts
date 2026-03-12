import { ApplyOptions } from '@sapphire/decorators'
import {
  type ContextMenuCommandSuccessPayload,
  Listener,
  LogLevel
} from '@sapphire/framework'
import type { Logger } from '@sapphire/plugin-logger'

import { logSuccessCommand } from '~/shared/utils/loggerUtil'

@ApplyOptions<Listener.Options>(({ container }) => ({
  enabled: (container.logger as Logger).level <= LogLevel.Debug
}))
export class UserListener extends Listener {
  public override run(payload: ContextMenuCommandSuccessPayload) {
    logSuccessCommand(payload)
  }
}
