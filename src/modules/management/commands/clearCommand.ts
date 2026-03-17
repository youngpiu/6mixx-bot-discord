import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel
} from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('clear')
    .setDescription('Xoá tin nhắn trong kênh')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Số lượng tin nhắn muốn xoá (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Chỉ xoá tin nhắn của người dùng này')
        .setRequired(false)
    )
)
@ApplyOptions<Command.Options>({
  name: 'clear',
  description: 'Xoá tin nhắn trong kênh'
})
export class ClearCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 'Ephemeral' })

    const amount = interaction.options.getInteger('amount', true)
    const user = interaction.options.getUser('user')
    const channel = interaction.channel as TextChannel

    if (!channel || !channel.isTextBased()) {
      return InteractionUtil.replyError(
        interaction,
        'Lệnh này chỉ có thể sử dụng trong kênh văn bản.'
      )
    }

    try {
      let count = 0

      if (user) {
        // Fetch up to 100 messages to filter
        const messages = await channel.messages.fetch({ limit: 100 })
        const userMessages = messages
          .filter((m) => m.author.id === user.id)
          .first(amount)

        if (userMessages.length === 0) {
          return InteractionUtil.replySuccess(
            interaction,
            `Không tìm thấy tin nhắn nào của ${user.tag} trong 100 tin nhắn gần nhất.`
          )
        }

        const deleted = await channel.bulkDelete(userMessages, true)
        count = deleted.size
      } else {
        const deleted = await channel.bulkDelete(amount, true)
        count = deleted.size
      }

      return InteractionUtil.replySuccess(
        interaction,
        `Đã xoá thành công **${count}** tin nhắn.`
      )
    } catch (error) {
      this.container.logger.error(
        '[Clear Command] Error clearing messages:',
        error
      )
      return InteractionUtil.replyError(
        interaction,
        'Đã xảy ra lỗi khi xoá tin nhắn. Có thể tin nhắn đã quá 14 ngày hoặc tôi không có quyền hạn.'
      )
    }
  }
}
