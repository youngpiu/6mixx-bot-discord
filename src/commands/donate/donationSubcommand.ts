import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'

import { DonateSetupCommand } from '~/commands/donate/_donateSetupCommand'
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
          name: 'setup',
          chatInputRun: 'chatInputSetup',
          preconditions: ['OwnerOnly']
        },
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

  public chatInputSetup = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return DonateSetupCommand.run(interaction)
    }
  )

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
          subcommand
            .setName('setup')
            .setDescription(
              '[OWNER] Thiết lập kênh nhận thông báo khi có người tạo mã QR để quyên góp.'
            )
            .addChannelOption((option) =>
              option
                .setName('channel')
                .addChannelTypes(ChannelType.GuildText)
                .setDescription('Kênh nhận thông báo.')
                .setRequired(true)
            )
        )
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
