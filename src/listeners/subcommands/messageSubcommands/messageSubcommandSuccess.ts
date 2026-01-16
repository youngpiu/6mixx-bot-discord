import type { MessageSubcommandSuccessPayload } from '@sapphire/plugin-subcommands'
import { Listener, LogLevel } from '@sapphire/framework'
import type { Logger } from '@sapphire/plugin-logger'
import { logSuccessCommand } from '~/utils/messageUtil'

export class UserEvent extends Listener {
  public override run(payload: MessageSubcommandSuccessPayload) {
    logSuccessCommand(payload)
  }

  public override onLoad() {
    this.enabled = (this.container.logger as Logger).level <= LogLevel.Debug
    return super.onLoad()
  }
}
