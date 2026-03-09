// Command to synchronize guild members with the database
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { GuildRepository } from '~/shared/repositories/guildRepository'
import { MemberRepository } from '~/shared/repositories/memberRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('sync')
    .setDescription('Đồng bộ tất cả thành viên trong máy chủ vào cơ sở dữ liệu')
)
@ApplyOptions<Command.Options>({
  name: 'sync',
  description: 'Đồng bộ tất cả thành viên trong máy chủ vào cơ sở dữ liệu',
  preconditions: ['OwnerOnly']
})
export class SyncCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction || !interaction.guild)
      throw new NormalError('Lệnh này chỉ dùng trong máy chủ.')

    await GuildRepository.upsert(interaction.guild.id)

    const members = await interaction.guild.members.fetch()

    const userMembers = members.filter((m) => !m.user.bot)

    if (userMembers.size === 0) {
      await InteractionUtil.replySuccess(
        interaction,
        'Đồng bộ hoàn tất — không có thành viên nào cần đồng bộ.'
      )
      return
    }

    const membersData = userMembers.map((m) => ({
      guildId: interaction.guild!.id,
      userId: m.id
    }))
    const result = await MemberRepository.createMany(membersData)

    this.container.logger.info(
      `[Sync Command] Synced ${result.count} members for guild ${interaction.guild.name}`
    )

    await InteractionUtil.replySuccess(
      interaction,
      `Đồng bộ hoàn tất — đã đồng bộ **${result.count}** thành viên vào cơ sở dữ liệu.`
    )
  }
}
