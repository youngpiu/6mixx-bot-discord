import { ChatInputCommandInteraction } from 'discord.js'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { BadRequestError } from '~/core/errorResponse'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { container } from '@sapphire/pieces'

export class TicketConfigChannelCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const ticketChannel = interaction.options.getChannel('ticket-channel')

    if (!ticketChannel) {
      throw new BadRequestError({
        description:
          'Vui lòng chọn một kênh để thiết lập hệ thống hỗ trợ thành viên'
      })
    }

    await container.prisma.ticketConfig.upsert({
      where: { guildId: interaction.guildId },
      update: { ticketChannelId: ticketChannel.id },
      create: {
        guildId: interaction.guildId,
        ticketChannelId: ticketChannel.id
      }
    })

    return interaction.reply({
      embeds: [
        createSuccessEmbed({
          title: 'Thiết lập thành công',
          description: `Đã thiết lập kênh <#${ticketChannel.id}> làm kênh hỗ trợ.`
        })
      ],
      flags: ['Ephemeral']
    })
  }
}
