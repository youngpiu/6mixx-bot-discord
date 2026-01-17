import { ChatInputCommandInteraction } from 'discord.js'
import { container } from '@sapphire/framework'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { BadRequestError } from '~/core/errorResponse'

export class TicketSetupCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
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
