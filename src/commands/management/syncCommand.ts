import { Command } from '@sapphire/framework'
import { ChatInputCommandInteraction } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'
import { MemberRepository } from '~/repositories/memberRepository'

export class SyncCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'sync',
      description: 'Đồng bộ tất cả thành viên trong máy chủ vào cơ sở dữ liệu',
      preconditions: ['GuildOnly', 'OwnerOnly']
    })
  }

  public chatInputRun = asyncChatInputHandler(async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guild || !interaction.guildId) throw new GuildOnlyError()

    await GuildRepository.getOrCreate(interaction.guildId)

    const members = await interaction.guild.members.fetch()

    const userMembers = members.filter((m) => !m.user.bot)

    if (userMembers.size === 0) {
      await interaction.editReply({
        embeds: [
          createSuccessEmbed({
            title: 'Đồng bộ hoàn tất',
            description: 'Không có thành viên nào cần đồng bộ.'
          })
        ]
      })
      await deleteReplyInteraction(interaction)
      return
    }

    const membersData = userMembers.map((m) => ({
      guildId: interaction.guildId!,
      userId: m.id
    }))
    const result = await MemberRepository.createMembers(membersData)

    this.container.logger.info(
      `[Sync Command] Synced ${result.count} members for guild ${interaction.guild.name}`
    )

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Đồng bộ hoàn tất',
          description: `Đã đồng bộ **${result.count}** thành viên vào cơ sở dữ liệu.`
        })
      ]
    })

    await deleteReplyInteraction(interaction)
  })

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    )
  }
}
