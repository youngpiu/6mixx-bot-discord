import { ApplyOptions } from '@sapphire/decorators'
import {
  type ChatInputCommandSuccessPayload,
  Listener,
  LogLevel
} from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import type { Logger } from '@sapphire/plugin-logger'

import { logSuccessCommand } from '~/shared/utils/loggerUtil'

/**
 * Listener triggered upon the successful execution of a chat input (slash) command.
 * Logs the execution event using `logSuccessCommand` if the logger level is set to Debug or lower.
 */
@ApplyOptions<Listener.Options>({
  enabled: (container.logger as Logger).level <= LogLevel.Debug
})
export class ChatInputCommandSuccessListener extends Listener {
  /**
   * Logs details of the successfully executed slash command.
   *
   * @param payload - Data object containing details of the command execution.
   */
  public override run(payload: ChatInputCommandSuccessPayload) {
    logSuccessCommand(payload)
  }
}
