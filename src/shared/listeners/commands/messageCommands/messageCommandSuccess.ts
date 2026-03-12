import { ApplyOptions } from '@sapphire/decorators'
import {
  Listener,
  LogLevel,
  type MessageCommandSuccessPayload
} from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import type { Logger } from '@sapphire/plugin-logger'

import { logSuccessCommand } from '~/shared/utils/loggerUtil'

/**
 * Listener triggered upon the successful execution of a message-based command.
 * Logs the execution event using `logSuccessCommand` if the logger level is set to Debug or lower.
 */
@ApplyOptions<Listener.Options>({
  enabled: (container.logger as Logger).level <= LogLevel.Debug
})
export class UserEvent extends Listener {
  /**
   * Logs details of the successfully executed message command.
   *
   * @param payload - Data object containing details of the command execution.
   */
  public override run(payload: MessageCommandSuccessPayload) {
    logSuccessCommand(payload)
  }
}
