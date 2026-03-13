import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { ChatInputCommandInteraction } from 'discord.js'

import { GuildRepository } from '~/shared/repositories/guildRepository'
import { GuildMemberSyncService } from '~/shared/services/guildMemberSyncService'
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

    const guild = interaction.guild!

    await GuildRepository.upsert(guild.id)

    const totalSynced = await GuildMemberSyncService.syncGuild(guild)

    this.container.logger.info(
      `[Sync Command] Synced ${totalSynced} members for guild ${guild.name}`
    )

    await InteractionUtil.replySuccess(
      interaction,
      totalSynced === 0
        ? 'Đồng bộ hoàn tất, không có thành viên nào cần đồng bộ.'
        : `Đồng bộ hoàn tất, đã đồng bộ **${totalSynced}** thành viên vào cơ sở dữ liệu.`
    )
  }
}
