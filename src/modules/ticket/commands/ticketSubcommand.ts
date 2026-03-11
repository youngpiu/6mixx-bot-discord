// Main ticket command router
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { TicketCloseCommand } from '~/modules/ticket/commands/_ticketCloseCommand'
import { TicketDetailCommand } from '~/modules/ticket/commands/_ticketDetailCommand'
import { TicketListCommand } from '~/modules/ticket/commands/_ticketListCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('ticket')
    .setDescription('Quản lý hệ thống hỗ trợ thành viên.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('close')
        .setDescription('[ADMIN] Đóng phiếu hỗ trợ hiện tại.')
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
        .setDescription('[ADMIN] Xem thông tin chi tiết phiếu hỗ trợ bất kỳ.')
        .addStringOption((option) =>
          option
            .setName('code')
            .setDescription('Mã phiếu hỗ trợ cần xem thông tin chi tiết.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('[ADMIN] Xem danh sách các phiếu hỗ trợ.')
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'ticket',
  description: 'Hệ thống hỗ trợ thành viên.',
  enabled: true,
  requiredUserPermissions: ['Administrator'],
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
