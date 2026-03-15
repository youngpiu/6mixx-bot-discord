import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { VipAddCommand } from '~/modules/vip/commands/_vipAddCommand'
import { VipRemoveCommand } from '~/modules/vip/commands/_vipRemoveCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('vip')
    .setDescription('Quản lý hệ thống vai trò VIP.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('[OWNER] Cấp vai trò VIP cho thành viên.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('[OWNER] Thu hồi vai trò VIP của thành viên.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Thành viên muốn thu hồi vai trò VIP.')
            .setRequired(true)
        )
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'vip',
  description: 'Quản lý hệ thống vai trò VIP.',
  preconditions: ['GuildOnly', 'OwnerOnly'],
  subcommands: [
    {
      name: 'add',
      chatInputRun: 'chatInputAdd'
    },
    {
      name: 'remove',
      chatInputRun: 'chatInputRemove'
    }
  ]
})
export class VipSubcommand extends Subcommand {
  public async chatInputAdd(interaction: ChatInputCommandInteraction) {
    return VipAddCommand.run(interaction)
  }

  public async chatInputRemove(interaction: ChatInputCommandInteraction) {
    return VipRemoveCommand.run(interaction)
  }
}
