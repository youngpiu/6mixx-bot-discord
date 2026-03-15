import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'

import { TIME } from '~/shared/constants/timeConstant'

import { InstagramCommand } from '~/modules/social/commands/_instagramCommand'

@ApplyOptions<Command.Options>({
  name: 'instagram',
  description: 'Tải media từ Instagram (Photo/Video/Reel)',
  cooldownDelay: TIME.M1,
  cooldownLimit: 1
})
export class InstagramCommandRegistry extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('url')
              .setDescription('Đường link Instagram')
              .setRequired(true)
          )
          .addBooleanOption((option) =>
            option
              .setName('caption')
              .setDescription('Hiển thị nội dung caption?')
              .setRequired(false)
          )
          .addBooleanOption((option) =>
            option
              .setName('spoiler')
              .setDescription('Ảnh/Video ở dạng theo dõi ẩn rủi ro?')
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
    return InstagramCommand.run(interaction)
  }
}
