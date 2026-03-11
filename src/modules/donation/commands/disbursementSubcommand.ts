// Main disbursement command router to manage bot expenses
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { DisbursementAddCommand } from '~/modules/donation/commands/_disbursementAddCommand'
import { DisbursementDetailCommand } from '~/modules/donation/commands/_disbursementDetailCommand'
import { DisbursementListCommand } from '~/modules/donation/commands/_disbursementListCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('disbursement')
    .setDescription('Quản lý hệ thống khoản chi.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('[OWNER] Xem danh sách các khoản chi.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('[OWNER] Thêm một khoản chi mới.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('detail')
        .setDescription('[OWNER] Xem thông tin chi tiết một khoản chi.')
        .addStringOption((option) =>
          option
            .setName('code')
            .setDescription('Mã khoản chi cần xem')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
)
@ApplyOptions<Subcommand.Options>({
  name: 'disbursement',
  description: 'Quản lý hệ thống khoản chi.',
  enabled: true,
  preconditions: ['OwnerOnly'],
  subcommands: [
    {
      name: 'list',
      chatInputRun: 'chatInputListDisbursement'
    },
    {
      name: 'add',
      chatInputRun: 'chatInputAddDisbursement'
    },
    {
      name: 'detail',
      chatInputRun: 'chatInputDetailDisbursement'
    }
  ]
})
export class DisbursementCommand extends Subcommand {
  public async chatInputListDisbursement(
    interaction: ChatInputCommandInteraction
  ) {
    return DisbursementListCommand.run(interaction)
  }

  public async chatInputAddDisbursement(
    interaction: ChatInputCommandInteraction
  ) {
    return DisbursementAddCommand.run(interaction)
  }

  public async chatInputDetailDisbursement(
    interaction: ChatInputCommandInteraction
  ) {
    return DisbursementDetailCommand.run(interaction)
  }
}
