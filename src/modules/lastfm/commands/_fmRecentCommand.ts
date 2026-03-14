import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

export class LastFmRecentCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser('user') || interaction.user
    const account = await LastFmRepository.findAccount(targetUser.id)

    if (!account) {
      const msg =
        targetUser.id === interaction.user.id
          ? 'Bạn chưa liên kết tài khoản Last.fm. Hãy dùng lệnh `/fm set` để liên kết.'
          : `Người dùng **${targetUser.username}** chưa liên kết tài khoản Last.fm.`
      throw new NormalError(msg)
    }

    try {
      const data = await LastFmApiService.getRecentTracks(
        account.lastfmUsername,
        10
      )
      const tracksData = data.recenttracks.track
      const tracks = Array.isArray(tracksData) ? tracksData : [tracksData]

      const trackList = tracks
        .map((t) => {
          const artist =
            typeof t.artist === 'string'
              ? t.artist
              : t.artist.name || t.artist['#text']
          const trackName = t.name
          const isNowPlaying = t['@attr']?.nowplaying === 'true'
          const time = isNowPlaying
            ? '**Đang nghe**'
            : t.date
              ? `<t:${t.date.uts}:R>`
              : 'Không rõ thời gian'

          return `- **${trackName}** — ${artist} (${time})`
        })
        .join('\n')

      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(
          `### Lịch sử nghe nhạc của ${targetUser.username}\n${trackList || 'Không có dữ liệu bài hát gần đây.'}`
        )
      )

      return InteractionUtil.replyWithContainer(interaction, container, false)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError(
        'Đã có lỗi xảy ra khi lấy danh sách bài hát gần đây.'
      )
    }
  }
}
