// Command to synchronize guild members with the database
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { ChatInputCommandInteraction, GuildMember } from 'discord.js'

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

    if (!interaction.guild) return

    await GuildRepository.upsert(interaction.guild.id)

    const guild = interaction.guild

    let after: string | undefined
    const allMembers: GuildMember[] = []

    while (true) {
      const chunk = await guild.members.list({
        limit: 100,
        after
      })

      if (chunk.size === 0) break

      const users = chunk.filter((m) => !m.user.bot)

      allMembers.push(...users.values())

      after = chunk.last()?.id
    }

    if (allMembers.length === 0) {
      await InteractionUtil.replySuccess(
        interaction,
        'Đồng bộ hoàn tất, không có thành viên nào cần đồng bộ.'
      )
      return
    }

    const membersData = allMembers.map((m) => ({
      guildId: guild.id,
      id: m.id
    }))

    const result = await MemberRepository.createMany(membersData)

    this.container.logger.info(
      `[Sync Command] Synced ${result.count} members for guild ${guild.name}`
    )

    await InteractionUtil.replySuccess(
      interaction,
      `Đồng bộ hoàn tất, đã đồng bộ **${result.count}** thành viên vào cơ sở dữ liệu.`
    )
  }
}
