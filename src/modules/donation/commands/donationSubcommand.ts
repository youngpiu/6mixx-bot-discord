// Main donation command router for owners to manage donations and disbursements
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { DonationDetailCommand } from '~/modules/donation/commands/_donationDetailCommand'
import { DonationListCommand } from '~/modules/donation/commands/_donationListCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('donation')
    .setDescription('Quản lý hệ thống quyên góp.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('[OWNER] Xem danh sách các khoản quyên góp.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('detail')
        .setDescription(
          '[OWNER] Xem thông tin chi tiết khoản quyên góp bất kỳ.'
        )
        .addStringOption((option) =>
          option
            .setName('code')
            .setDescription('Mã quyên góp cần xem thông tin chi tiết.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'donation',
  description: 'Quản lý hệ thống quyên góp.',
  enabled: true,
  preconditions: ['OwnerOnly'],
  subcommands: [
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
export class DonationSubcommand extends Subcommand {
  public async chatInputList(interaction: ChatInputCommandInteraction) {
    return DonationListCommand.run(interaction)
  }

  public async chatInputDetail(interaction: ChatInputCommandInteraction) {
    return DonationDetailCommand.run(interaction)
  }
}
