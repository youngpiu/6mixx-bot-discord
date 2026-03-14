import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

export class LastFmProfileCommand {
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
      const [userInfo, topArtists, topTracks] = await Promise.all([
        LastFmApiService.getUserInfo(account.lastfmUsername),
        LastFmApiService.getUserTopArtists(
          account.lastfmUsername,
          'overall',
          5
        ),
        LastFmApiService.getUserTopTracks(account.lastfmUsername, 'overall', 5)
      ])

      const user = userInfo.user
      const joinDate = new Date(
        parseInt(user.registered.unixtime, 10) * 1000
      ).toLocaleDateString('vi-VN')

      const container = new ContainerBuilder()
        .addSectionComponents((section) => {
          section.addTextDisplayComponents(
            (t) => t.setContent(`### [${user.name}](${user.url})`),
            (t) => t.setContent(`Hồ sơ Last.fm của ${targetUser.username}`)
          )

          const thumbnailUrl =
            user.image.find((i) => i.size === 'extralarge')?.['#text'] || null
          if (thumbnailUrl) {
            section.setThumbnailAccessory((thumb) => thumb.setURL(thumbnailUrl))
          }
          return section
        })
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(
            `**Tổng Scrobbles:** ${parseInt(user.playcount, 10).toLocaleString()}\n` +
              `**Nghệ sĩ:** ${topArtists.topartists['@attr'].total}\n` +
              `**Bài hát:** ${topTracks.toptracks['@attr'].total}`
          )
        )

      const topArtistsList = topArtists.topartists.artist
        .map(
          (a, i) =>
            `${i + 1}. **[${a.name}](${a.url})** (${parseInt(a.playcount, 10).toLocaleString()} lượt nghe)`
        )
        .join('\n')

      const topTracksList = topTracks.toptracks.track
        .map(
          (t, i) =>
            `${i + 1}. **[${t.name}](${t.url})** - ${t.artist.name} (${parseInt(t.playcount, 10).toLocaleString()} lượt nghe)`
        )
        .join('\n')

      if (topArtistsList) {
        container
          .addSeparatorComponents((s) => s)
          .addTextDisplayComponents((t) =>
            t.setContent(`**Nghệ sĩ nghe nhiều nhất**\n${topArtistsList}`)
          )
      }

      if (topTracksList) {
        container
          .addSeparatorComponents((s) => s)
          .addTextDisplayComponents((t) =>
            t.setContent(`**Bài hát nghe nhiều nhất**\n${topTracksList}`)
          )
      }

      container
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(`-# Đã tham gia Last.fm từ ${joinDate}`)
        )

      return InteractionUtil.replyWithContainer(interaction, container)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError('Đã có lỗi xảy ra khi lấy dữ liệu hồ sơ.')
    }
  }
}
