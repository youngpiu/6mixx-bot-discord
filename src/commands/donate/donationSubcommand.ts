import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'

import { DonationDetailCommand } from '~/commands/donate/_donationDetailCommand'
import { DonationListCommand } from '~/commands/donate/_donationListCommand'

export class DonationSubcommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'donation',
      description: 'Quản lý hệ thống quyên góp.',
      subcommands: [
        {
          name: 'list',
          chatInputRun: 'chatInputList',
          preconditions: ['OwnerOnly']
        },
        {
          name: 'detail',
          chatInputRun: 'chatInputDetail',
          preconditions: ['OwnerOnly']
        }
      ]
    })
  }

  public chatInputList = asyncChatInputHandler(async (interaction: ChatInputCommandInteraction) => {
    return DonationListCommand.run(interaction)
  })

  public chatInputDetail = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return DonationDetailCommand.run(interaction)
    }
  )

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
    )
  }
}
