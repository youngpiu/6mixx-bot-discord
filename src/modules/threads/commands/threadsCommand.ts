import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'

import { TIME } from '~/shared/constants/timeConstant'

import { ThreadsCommand } from './_threadsCommand'

@ApplyOptions<Command.Options>({
  name: 'threads',
  description: 'Tải media (Ảnh/Video) từ Threads',
  cooldownDelay: TIME.M1,
  cooldownLimit: 1
})
export class ThreadsCommandRegistry extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('url')
              .setDescription('Đường dẫn bài viết trên Threads')
              .setRequired(true)
          )
          .addBooleanOption((option) =>
            option
              .setName('caption')
              .setDescription('Hiển thị nội dung bài viết')
              .setRequired(false)
          )
          .addBooleanOption((option) =>
            option
              .setName('spoiler')
              .setDescription('Ảnh/Video ở dạng spoiler?')
              .setRequired(false)
          ),
      {
        idHints: []
      }
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    await ThreadsCommand.run(interaction)
  }
}
