// Main ticket command router
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { TicketCloseCommand } from '~/modules/ticket/commands/_ticketCloseCommand'
import { TicketDetailCommand } from '~/modules/ticket/commands/_ticketDetailCommand'
import { TicketListCommand } from '~/modules/ticket/commands/_ticketListCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('ticket')
    .setDescription('Quản lý hệ thống hỗ trợ thành viên.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('close')
        .setDescription('Đóng phiếu hỗ trợ hiện tại.')
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Lý do đóng phiếu hỗ trợ.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('detail')
        .setDescription(
          '[ADMINISTRATOR] Xem thông tin chi tiết một phiếu hỗ trợ bằng mã phiếu.'
        )
        .addStringOption((option) =>
          option
            .setName('ticket-id')
            .setDescription('Mã phiếu hỗ trợ mà bạn muốn xem chi tiết.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription(
          '[ADMINISTRATOR] Xem danh sách các phiếu hỗ trợ có trong cơ sở dữ liệu.'
        )
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'ticket',
  description: 'Hệ thống hỗ trợ thành viên.',
  subcommands: [
    {
      name: 'close',
      chatInputRun: 'chatInputClose'
    },
    {
      name: 'list',
      chatInputRun: 'chatInputList'
    },
    {
      name: 'detail',
      chatInputRun: 'chatInputDetail'
    }
  ]
})
export class TicketSubcommand extends Subcommand {
  public async chatInputClose(interaction: ChatInputCommandInteraction) {
    return TicketCloseCommand.run(interaction)
  }

  public async chatInputList(interaction: ChatInputCommandInteraction) {
    return TicketListCommand.run(interaction)
  }

  public async chatInputDetail(interaction: ChatInputCommandInteraction) {
    return TicketDetailCommand.run(interaction)
  }
}
