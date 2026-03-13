import { ChatInputCommandInteraction } from 'discord.js'

import { VipService } from '../services/VipService'

export class VipRemoveCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true)

    await interaction.deferReply({ flags: ['Ephemeral'] })

    await VipService.revokeVip(interaction.guild!, user.id)

    await interaction.editReply({
      content: `Đã thu hồi quyền VIP của ${user.toString()}. Role sẽ được xóa hoàn toàn sau 7 ngày nếu không được cấp lại.`
    })
  }
}
