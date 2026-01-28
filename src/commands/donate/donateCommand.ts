import { Command } from '@sapphire/framework'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'

import { DonateHandler } from '~/commands/donate/_donateCommand'

export class DonateCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'donate',
      description: '[EVERYONE] Quyên góp chi phí để thuê máy chủ chạy BOT.'
    })
  }

  public override chatInputRun = asyncChatInputHandler(async (interaction) => {
    return DonateHandler.run(interaction)
  })

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName('money')
            .setDescription('Số tiền quyên góp (1,000 - 1,000,000đ)')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('message').setDescription('Lời nhắn gửi kèm (tùy chọn)')
        )
    )
  }
}
