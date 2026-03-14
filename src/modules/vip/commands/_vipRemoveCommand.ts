import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { VipService } from '~/modules/vip/services/VipService'

export class VipRemoveCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true)

    await interaction.deferReply({ flags: ['Ephemeral'] })

    await VipService.deleteVipInstant(interaction.guild!, user.id)

    await InteractionUtil.replyWithContainer(
      interaction,
      `Đã thu hồi vai trò VIP của <@${user.id}>`
    )
  }
}
