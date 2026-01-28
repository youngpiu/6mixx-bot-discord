import { ChannelType, ChatInputCommandInteraction } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class DonateSetupCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText])

    await DonateRepository.upsertConfig({
      guildId: interaction.guildId,
      notificationChannelId: channel.id
    })

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Thiết lập thành công',
          description: `Đã thiết lập kênh thông báo quyên góp tại ${channel.toString()}`
        })
      ]
    })
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.SHORT)
  }
}
