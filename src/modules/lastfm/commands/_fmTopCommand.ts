import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

export type TopType = 'artists' | 'albums' | 'tracks'

export class LastFmTopCommand {
  public static async run(
    interaction: ChatInputCommandInteraction,
    type: TopType
  ) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser('user') || interaction.user
    const period = interaction.options.getString('period') || 'overall'
    const account = await LastFmRepository.findAccount(targetUser.id)

    if (!account) {
      const msg =
        targetUser.id === interaction.user.id
          ? 'Bạn chưa liên kết tài khoản Last.fm. Hãy dùng lệnh `/fm set` để liên kết.'
          : `Người dùng **${targetUser.username}** chưa liên kết tài khoản Last.fm.`
      throw new NormalError(msg)
    }

    try {
      let title = ''
      let list = ''

      if (type === 'artists') {
        const data = await LastFmApiService.getUserTopArtists(
          account.lastfmUsername,
          period,
          10
        )
        title = `Nghệ sĩ nghe nhiều nhất của ${targetUser.username} (${this.mapPeriod(period)})`
        list = data.topartists.artist
          .map(
            (a, i) =>
              `${i + 1}. **[${a.name}](${a.url})** (${parseInt(a.playcount, 10).toLocaleString()} lượt nghe)`
          )
          .join('\n')
      } else if (type === 'albums') {
        const data = await LastFmApiService.getUserTopAlbums(
          account.lastfmUsername,
          period,
          10
        )
        title = `Album nghe nhiều nhất của ${targetUser.username} (${this.mapPeriod(period)})`
        list = data.topalbums.album
          .map(
            (a, i) =>
              `${i + 1}. **[${a.name}](${a.url})** - ${a.artist.name} (${parseInt(a.playcount, 10).toLocaleString()} lượt nghe)`
          )
          .join('\n')
      } else if (type === 'tracks') {
        const data = await LastFmApiService.getUserTopTracks(
          account.lastfmUsername,
          period,
          10
        )
        title = `Bài hát nghe nhiều nhất của ${targetUser.username} (${this.mapPeriod(period)})`
        list = data.toptracks.track
          .map(
            (t, i) =>
              `${i + 1}. **[${t.name}](${t.url})** - ${t.artist.name} (${parseInt(t.playcount, 10).toLocaleString()} lượt nghe)`
          )
          .join('\n')
      }

      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`### ${title}\n${list || 'Không có dữ liệu.'}`)
      )

      return InteractionUtil.replyWithContainer(interaction, container, false)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError(`Đã có lỗi xảy ra khi lấy dữ liệu ${type}.`)
    }
  }

  private static mapPeriod(period: string): string {
    const mapping: Record<string, string> = {
      overall: 'Tất cả thời gian',
      '7day': '7 ngày qua',
      '1month': '1 tháng qua',
      '3month': '3 tháng qua',
      '6month': '6 tháng qua',
      '12month': '1 năm qua'
    }
    return mapping[period] || period
  }
}
