import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { container } from '@sapphire/pieces'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { DisbursementAddCommand } from '~/modules/donation/commands/_disbursementAddCommand'
import { DisbursementListCommand } from '~/modules/donation/commands/_disbursementListCommand'
import { DonationDetailCommand } from '~/modules/donation/commands/_donationDetailCommand'
import { DonationListCommand } from '~/modules/donation/commands/_donationListCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('donation')
    .setDescription('Quản lý hệ thống quyên góp.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('[OWNER] Xem danh sách các khoản quyên góp.')
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
        .setDescription('[OWNER] Quản lý các khoản chi.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('add')
            .setDescription('[OWNER] Thêm một khoản chi mới.')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('list')
            .setDescription('[OWNER] Xem danh sách các khoản chi.')
        )
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'donation',
  description: 'Quản lý hệ thống quyên góp.',
  preconditions: ['OwnerOnly'],
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
      type: 'group',
      name: 'disbursement',
      entries: [
        { name: 'add', chatInputRun: 'chatInputAddDisbursement' },
        { name: 'list', chatInputRun: 'chatInputListDisbursement' }
      ]
    }
  ]
})
export class DonationSubcommand extends Subcommand {
  public async chatInputList(interaction: ChatInputCommandInteraction) {
    return DonationListCommand.run(interaction)
  }

  public async chatInputDetail(interaction: ChatInputCommandInteraction) {
    return DonationDetailCommand.run(interaction)
  }

  public async chatInputAddDisbursement(
    interaction: ChatInputCommandInteraction
  ) {
    return DisbursementAddCommand.run(interaction)
  }

  public async chatInputListDisbursement(
    interaction: ChatInputCommandInteraction
  ) {
    return DisbursementListCommand.run(interaction)
  }

  public override async autocompleteRun(
    interaction: Subcommand.AutocompleteInteraction
  ) {
    const subcommand = interaction.options.getSubcommand()
    const focused = interaction.options.getFocused(true)

    if (subcommand === 'detail' && focused.name === 'code') {
      const results = await container.prisma.donation.findMany({
        where: {
          guildId: interaction.guild!.id,
          code: { contains: focused.value as string, mode: 'insensitive' }
        },
        take: 25
      })

      return interaction.respond(
        results.map((r) => ({
          name: `${r.code} (${r.amount.toLocaleString('vi-VN')}đ)`,
          value: r.code
        }))
      )
    }

    return interaction.respond([])
  }
}
