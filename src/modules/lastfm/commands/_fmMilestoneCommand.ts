import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  SectionBuilder
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

export class LastFmMilestoneCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser('user') || interaction.user
    const milestoneNumber = interaction.options.getInteger('number', true)

    if (milestoneNumber <= 0) {
      throw new NormalError('Số thứ tự phải lớn hơn 0.')
    }

    const account = await LastFmRepository.findAccount(targetUser.id)
    if (!account) {
      const msg =
        targetUser.id === interaction.user.id
          ? 'Bạn chưa liên kết tài khoản Last.fm. Hãy dùng lệnh `/fm set` để liên kết.'
          : `Người dùng **${targetUser.username}** chưa liên kết tài khoản Last.fm.`
      throw new NormalError(msg)
    }

    try {
      // 1. Get total scrobbles
      const userInfo = await LastFmApiService.getUserInfo(
        account.lastfmUsername
      )
      const total = parseInt(userInfo.user.playcount, 10)

      if (milestoneNumber > total) {
        throw new NormalError(
          `Bạn chỉ mới có **${total.toLocaleString()}** lượt nghe. Không thể tìm bài thứ **${milestoneNumber.toLocaleString()}**.`
        )
      }

      // 2. Fetch the specific track
      // Total = 100, Milestone = 100 -> Page 1
      // Total = 100, Milestone = 1 -> Page 100
      const page = total - milestoneNumber + 1
      const recentTracks = await LastFmApiService.getRecentTracks(
        account.lastfmUsername,
        1,
        page
      )

      const tracksData = recentTracks.recenttracks.track
      const tracks = Array.isArray(tracksData) ? tracksData : [tracksData]

      // If page is 1, the first track might be a "Now Playing" track which isn't counted in the total
      let track = tracks[0]
      if (
        page === 1 &&
        track?.['@attr']?.nowplaying === 'true' &&
        tracks.length > 1
      ) {
        track = tracks[1]
      } else if (
        page === 1 &&
        track?.['@attr']?.nowplaying === 'true' &&
        tracks.length === 1
      ) {
        // This case shouldn't happen if limit=1 and it's the 1st page, Last.fm usually returns
        // the last finished track + NP track.
        // But if it does, we might need page 2.
        const nextReq = await LastFmApiService.getRecentTracks(
          account.lastfmUsername,
          1,
          2
        )
        const nextTracks = Array.isArray(nextReq.recenttracks.track)
          ? nextReq.recenttracks.track
          : [nextReq.recenttracks.track]
        track = nextTracks[0]
      }

      if (!track || !track.date) {
        throw new NormalError('Không tìm thấy dữ liệu cho cột mốc này.')
      }

      const artistName =
        track.artist.name || track.artist['#text'] || 'Unknown Artist'
      const trackName = track.name
      const albumName =
        track.album?.title || track.album?.['#text'] || 'Unknown Album'
      const date = new Date(parseInt(track.date.uts, 10) * 1000).toLocaleString(
        'vi-VN'
      )

      const imageUrl =
        track.image.find((i) => i.size === 'extralarge')?.['#text'] ||
        track.image.find((i) => i.size === 'large')?.['#text']

      const container = new ContainerBuilder().addSectionComponents(
        (s: SectionBuilder) =>
          s
            .addTextDisplayComponents(
              (t) =>
                t.setContent(
                  `### Lượt nghe thứ #${milestoneNumber.toLocaleString()} của ${targetUser.username}\n**${trackName}**\nBởi **${artistName}**\nTrong album *${albumName}*`
                ),
              (t) => t.setContent(`Nghe vào lúc ${date}`)
            )
            .setThumbnailAccessory((thumb) =>
              thumb.setURL(imageUrl || targetUser.displayAvatarURL())
            )
      )

      return InteractionUtil.replyWithContainer(interaction, container)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError('Đã có lỗi xảy ra khi tìm cột mốc.')
    }
  }
}
