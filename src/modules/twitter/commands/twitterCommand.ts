import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'

import { TIME } from '~/shared/constants/timeConstant'

import { TwitterCommand } from './_twitterCommand'

@ApplyOptions<Command.Options>({
  name: 'x',
  description: 'Tải media từ X/Twitter',
  cooldownDelay: TIME.M1,
  cooldownLimit: 1
})
export class TwitterCommandRegistry extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('url')
              .setDescription('Đường dẫn bài viết trên Twitter/X')
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
              .setName('stats')
              .setDescription('Hiển thị thông số (Lượt thích, retweet...)')
              .setRequired(false)
          )
          .addBooleanOption((option) =>
            option
              .setName('spoiler')
              .setDescription('Ảnh/Video ở dạng theo dõi ẩn rủi ro?')
              .setRequired(false)
          ),
      {
        idHints: [] // Generate new later
      }
    )
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    await TwitterCommand.run(interaction)
  }
}
