import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { DonationDisbursementAddCommand } from '~/commands/donate/_disbursementAddCommand'
import { DonationDisbursementListCommand } from '~/commands/donate/_disbursementListCommand'
import { DonationDetailCommand } from '~/commands/donate/_donationDetailCommand'
import { DonationListCommand } from '~/commands/donate/_donationListCommand'

export class DonationSubcommand extends Subcommand {
  /**
   * Main entry point for the /donation command.
   * Defines subcommands for managing donations and disbursements.
   */
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'donation',
      description: 'Quản lý hệ thống quyên góp.',
      subcommands: [
        {
          name: 'list',
          chatInputRun: 'chatInputList'
        },
        {
          name: 'detail',
          chatInputRun: 'chatInputDetail'
        },
        {
          name: 'disbursement',
          type: 'group',
          entries: [
            { name: 'add', chatInputRun: 'chatInputAddDisbursement' },
            {
              name: 'list',
              chatInputRun: 'chatInputListDisbursement'
            }
          ]
        }
      ]
    })
  }

  public async chatInputList(interaction: ChatInputCommandInteraction) {
    return DonationListCommand.run(interaction)
  }

  public async chatInputDetail(interaction: ChatInputCommandInteraction) {
    return DonationDetailCommand.run(interaction)
  }

  public async chatInputAddDisbursement(interaction: ChatInputCommandInteraction) {
    return DonationDisbursementAddCommand.run(interaction)
  }

  public async chatInputListDisbursement(interaction: ChatInputCommandInteraction) {
    return DonationDisbursementListCommand.run(interaction)
  }

  /**
   * Registers the slash command structure
   */
  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('donation')
        .setDescription('Quản lý hệ thống quyên góp.')
        .addSubcommand((subcommand) =>
          subcommand.setName('list').setDescription('[OWNER] Xem danh sách các khoản quyên góp.')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('detail')
            .setDescription('[OWNER] Xem chi tiết và xác nhận khoản quyên góp.')
            .addStringOption((option) =>
              option
                .setName('code')
                .setDescription('Mã quyên góp cần xem chi tiết.')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommandGroup((group) =>
          group
            .setName('disbursement')
            .setDescription('[OWNER] Quản lý giải ngân.')
            .addSubcommand((subcommand) =>
              subcommand.setName('add').setDescription('[OWNER] Tạo khoản giải ngân mới.')
            )
            .addSubcommand((subcommand) =>
              subcommand.setName('list').setDescription('[OWNER] Xem danh sách giải ngân.')
            )
        )
    )
  }
}
