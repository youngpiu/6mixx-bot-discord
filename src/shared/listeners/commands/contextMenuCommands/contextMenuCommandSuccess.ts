import { ApplyOptions } from '@sapphire/decorators'
import {
  type ContextMenuCommandSuccessPayload,
  Listener,
  LogLevel
} from '@sapphire/framework'
import type { Logger } from '@sapphire/plugin-logger'

import { logSuccessCommand } from '~/shared/utils/loggerUtil'

/**
 * Listener triggered upon the successful execution of a context menu command.
 * Logs the execution event using `logSuccessCommand` if the logger level is set to Debug or lower.
 */
@ApplyOptions<Listener.Options>(({ container }) => ({
  enabled: (container.logger as Logger).level <= LogLevel.Debug
}))
export class UserListener extends Listener {
  /**
   * Logs details of the successfully executed context menu command.
   *
   * @param payload - Data object containing details of the command execution.
   */
  public override run(payload: ContextMenuCommandSuccessPayload) {
    logSuccessCommand(payload)
  }
}
