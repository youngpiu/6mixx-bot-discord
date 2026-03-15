import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'

import { TIME } from '~/shared/constants/timeConstant'

import { TikTokCommand } from '~/modules/tiktok/commands/_tiktokCommand'

@ApplyOptions<Command.Options>({
  name: 'tiktok',
  description: 'Tải video TikTok không watermark',
  cooldownDelay: TIME.M1,
  cooldownLimit: 1
})
export class TikTokCommandRegistry extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('url')
              .setDescription('Đường dẫn video TikTok (URL hoặc ID)')
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
              .setDescription('Hiển thị thông số (Lượt thích, xem...)')
              .setRequired(false)
          )
          .addBooleanOption((option) =>
            option
              .setName('spoiler')
              .setDescription('Video ở dạng theo dõi ẩn rủi ro?')
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
    await TikTokCommand.run(interaction)
  }
}
