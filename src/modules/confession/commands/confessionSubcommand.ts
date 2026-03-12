import {
  ApplyOptions,
  RegisterChatInputCommand,
  RequiresGuildContext
} from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { ConfessionDetailCommand } from '~/modules/confession/commands/_confessionDetailCommand'
import { ConfessionListCommand } from '~/modules/confession/commands/_confessionListCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('confession')
    .setDescription('Quản lý hệ thống confession.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('detail')
        .setDescription('[ADMIN] Xem thông tin chi tiết confession bất kỳ.')
        .addStringOption((option) =>
          option
            .setName('code')
            .setDescription('Mã confession cần xem thông tin chi tiết.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('[ADMIN] Xem danh sách các confession.')
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'confession',
  description: 'Quản lý hệ thống confession.',
  requiredUserPermissions: ['Administrator'],
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
export class ConfessionSubcommand extends Subcommand {
  @RequiresGuildContext()
  public async chatInputList(interaction: ChatInputCommandInteraction) {
    return ConfessionListCommand.run(interaction)
  }

  @RequiresGuildContext()
  public async chatInputDetail(interaction: ChatInputCommandInteraction) {
    return ConfessionDetailCommand.run(interaction)
  }
}
