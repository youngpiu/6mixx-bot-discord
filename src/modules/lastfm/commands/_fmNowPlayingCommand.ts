import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmService } from '~/modules/lastfm/services/lastFmService'

export class LastFmNowPlayingCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser('user') || interaction.user
    const result = await LastFmService.getNowPlaying(targetUser.id)

    const { track, userStats, milestone } = result

    // Build Embed
    const artistName =
      track.artist.name || track.artist['#text'] || 'Unknown Artist'
    const trackName = track.name
    const albumName =
      track.album?.title || track.album?.['#text'] || 'Unknown Album'
    const imageUrl =
      track.image.find((i) => i.size === 'extralarge')?.['#text'] ||
      track.image.find((i) => i.size === 'large')?.['#text']

    const containers: ContainerBuilder[] = []

    const mainContainer = new ContainerBuilder()
      .addSectionComponents((s) =>
        s
          .addTextDisplayComponents((t) =>
            t.setContent(
              `[**${trackName}**](${track.url})\n**${artistName}** — *${albumName}*`
            )
          )
          .setThumbnailAccessory((thumb) => thumb.setURL(imageUrl || ''))
      )
      .addSeparatorComponents((s) => s)
      .addTextDisplayComponents((t) =>
        t.setContent(
          `👤 ${userStats.trackPlaycount} lần cho bài này\n👨‍🎤 ${userStats.artistPlaycount} lần cho nghệ sĩ`
        )
      )

    containers.push(mainContainer)

    if (milestone) {
      const milestoneContainer =
        new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent(
            `🎉 **CỘT MỐC MỚI!**\nChúc mừng **${targetUser.username}** đã đạt **${milestone.toLocaleString()}** lượt nghe trên Last.fm!`
          )
        )
      containers.push(milestoneContainer)
    }

    return InteractionUtil.replyWithComponents(interaction, containers)
  }
}
