// Main disbursement command router to manage bot expenses
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js'

import { DisbursementAddCommand } from '~/modules/donation/commands/_disbursementAddCommand'
import { DisbursementListCommand } from '~/modules/donation/commands/_disbursementListCommand'
import { DisbursementRemoveCommand } from '~/modules/donation/commands/_disbursementRemoveCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('disbursement')
    .setDescription('Quản lý hệ thống khoản chi.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('[ADMIN] Xem danh sách các khoản chi.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('[ADMIN] Thêm một khoản chi mới.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('[ADMIN] Xóa một khoản chi đã tạo.')
        .addStringOption((option) =>
          option
            .setName('disbursement')
            .setDescription('Khoản chi cần xóa')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
)
@ApplyOptions<Subcommand.Options>({
  name: 'disbursement',
  description: 'Quản lý hệ thống khoản chi.',
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
      name: 'remove',
      chatInputRun: 'chatInputRemoveDisbursement',
      // @ts-expect-error sapphire doesn't fully type subcommand autocomplete hooks correctly without manual typing
      autocompleteRun: 'autocompleteRemoveDisbursement'
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

  public async chatInputRemoveDisbursement(
    interaction: ChatInputCommandInteraction
  ) {
    return DisbursementRemoveCommand.run(interaction)
  }

  public async autocompleteRemoveDisbursement(
    interaction: AutocompleteInteraction
  ) {
    return DisbursementRemoveCommand.autocompleteRun(interaction)
  }
}
