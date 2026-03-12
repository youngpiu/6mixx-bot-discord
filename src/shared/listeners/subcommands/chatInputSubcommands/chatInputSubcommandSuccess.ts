import { ApplyOptions } from '@sapphire/decorators'
import { Listener, LogLevel } from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import type { Logger } from '@sapphire/plugin-logger'
import type { ChatInputSubcommandSuccessPayload } from '@sapphire/plugin-subcommands'

import { logSuccessCommand } from '~/shared/utils/loggerUtil'

@ApplyOptions<Listener.Options>({
  enabled: (container.logger as Logger).level <= LogLevel.Debug
})
export class UserListener extends Listener {
  public override run(payload: ChatInputSubcommandSuccessPayload) {
    logSuccessCommand(payload)
  }
}
