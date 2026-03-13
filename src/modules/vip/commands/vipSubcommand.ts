import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js'

import { VipAddCommand } from './_vipAddCommand'
import { VipRemoveCommand } from './_vipRemoveCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('vip')
    .setDescription('Quản lý hệ thống Custom VIP Role.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('[ADMIN] Cấp quyền VIP cho người dùng.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('[ADMIN] Thu hồi quyền VIP của người dùng.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng cần thu hồi quyền VIP.')
            .setRequired(true)
        )
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'vip',
  description: 'Quản lý hệ thống Custom VIP Role.',
  requiredUserPermissions: ['Administrator'],
  runIn: [ChannelType.GuildText],
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
