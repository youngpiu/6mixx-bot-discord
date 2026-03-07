import { Listener, LogLevel } from '@sapphire/framework'
import type { Logger } from '@sapphire/plugin-logger'
import type { ChatInputSubcommandSuccessPayload } from '@sapphire/plugin-subcommands'

import { logSuccessCommand } from '~/utils/loggerUtil'

export class UserListener extends Listener {
  public override run(payload: ChatInputSubcommandSuccessPayload) {
    logSuccessCommand(payload)
  }

  public override onLoad() {
    this.enabled = (this.container.logger as Logger).level <= LogLevel.Debug
    return super.onLoad()
  }
}
