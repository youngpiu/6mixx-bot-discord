import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

export class LastFmServerCommand {
  /**
   * fm server nowplaying
   */
  public static async runNowPlaying(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return
    await interaction.deferReply()

    try {
      const members = await LastFmRepository.getGuildFmMembers(
        interaction.guildId
      )
      if (members.length === 0) {
        throw new NormalError(
          'Chưa có thành viên nào trong server này liên kết Last.fm.'
        )
      }

      // Fetch NP for all members in parallel (with bottleneck control in ApiService)
      const npResults = await Promise.all(
        members.map(async (member) => {
          try {
            const data = await LastFmApiService.getRecentTracks(
              member.lastfmUsername,
              1
            )
            const track = Array.isArray(data.recenttracks.track)
              ? data.recenttracks.track[0]
              : data.recenttracks.track
            if (track && track['@attr']?.nowplaying === 'true') {
              return {
                userId: member.userId,
                trackName: track.name,
                artistName:
                  typeof track.artist === 'string'
                    ? track.artist
                    : track.artist.name || track.artist['#text']
              }
            }
          } catch {
            return null
          }
          return null
        })
      )

      const activeTracks = npResults.filter(
        (r): r is NonNullable<typeof r> => r !== null
      )

      if (activeTracks.length === 0) {
        throw new NormalError(
          'Hiện tại không có ai trong server đang nghe nhạc.'
        )
      }

      const list = activeTracks
        .map(
          (t) => `- <@${t.userId}>: **${t.trackName}** by **${t.artistName}**`
        )
        .join('\n')

      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`### Đang nghe trong server\n${list}`)
      )

      return InteractionUtil.replyWithContainer(interaction, container, false)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError(
        'Đã có lỗi xảy ra khi lấy danh sách đang nghe của server.'
      )
    }
  }

  /**
   * fm server recent
   */
  public static async runRecent(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return
    await interaction.deferReply()

    try {
      const members = await LastFmRepository.getGuildFmMembers(
        interaction.guildId
      )
      if (members.length === 0) {
        throw new NormalError(
          'Chưa có thành viên nào trong server này liên kết Last.fm.'
        )
      }

      // Fetch last track for all members
      const recentResults = await Promise.all(
        members.map(async (member) => {
          try {
            const data = await LastFmApiService.getRecentTracks(
              member.lastfmUsername,
              1
            )
            const track = Array.isArray(data.recenttracks.track)
              ? data.recenttracks.track[0]
              : data.recenttracks.track
            if (track && track.date) {
              return {
                userId: member.userId,
                trackName: track.name,
                artistName:
                  typeof track.artist === 'string'
                    ? track.artist
                    : track.artist.name || track.artist['#text'],
                uts: parseInt(track.date.uts, 10)
              }
            }
          } catch {
            return null
          }
          return null
        })
      )

      const tracks = recentResults
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.uts - a.uts)
        .slice(0, 15)

      if (tracks.length === 0) {
        throw new NormalError(
          'Không tìm thấy dữ liệu lượt nghe gần đây của server.'
        )
      }

      const list = tracks
        .map(
          (t) =>
            `- <@${t.userId}>: **${t.trackName}** — ${t.artistName} (<t:${t.uts}:R>)`
        )
        .join('\n')

      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`### Lượt nghe gần đây trong server\n${list}`)
      )

      return InteractionUtil.replyWithContainer(interaction, container, false)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError(
        'Đã có lỗi xảy ra khi lấy danh sách lượt nghe của server.'
      )
    }
  }

  /**
   * fm server leaderboard
   */
  public static async runLeaderboard(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return
    await interaction.deferReply()

    try {
      const members = await LastFmRepository.getGuildFmMembers(
        interaction.guildId
      )
      if (members.length === 0) {
        throw new NormalError(
          'Chưa có thành viên nào trong server này liên kết Last.fm.'
        )
      }

      // Sort members by total scrobbles (already in DB)
      const sortedMembers = members
        .sort((a, b) => b.totalScrobbles - b.totalScrobbles) // Force sort by playcount
        .sort((a, b) => b.totalScrobbles - a.totalScrobbles)
        .slice(0, 15)

      const list = sortedMembers
        .map(
          (m, i) =>
            `${i + 1}. <@${m.userId}> : **${m.totalScrobbles.toLocaleString()}** scrobbles`
        )
        .join('\n')

      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`### Bảng xếp hạng Last.fm server\n${list}`)
      )

      return InteractionUtil.replyWithContainer(interaction, container, false)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError('Đã có lỗi xảy ra khi lấy bảng xếp hạng server.')
    }
  }
}
