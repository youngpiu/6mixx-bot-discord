import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { LastFmAlbumCommand } from '~/modules/lastfm/commands/_fmAlbumCommand'
import { LastFmArtistCommand } from '~/modules/lastfm/commands/_fmArtistCommand'
import { LastFmChartCommand } from '~/modules/lastfm/commands/_fmChartCommand'
import { LastFmMilestoneCommand } from '~/modules/lastfm/commands/_fmMilestoneCommand'
import { LastFmNowPlayingCommand } from '~/modules/lastfm/commands/_fmNowPlayingCommand'
import { LastFmProfileCommand } from '~/modules/lastfm/commands/_fmProfileCommand'
import { LastFmRecentCommand } from '~/modules/lastfm/commands/_fmRecentCommand'
import { LastFmServerCommand } from '~/modules/lastfm/commands/_fmServerCommand'
import { LastFmSetCommand } from '~/modules/lastfm/commands/_fmSetCommand'
import { LastFmTopCommand } from '~/modules/lastfm/commands/_fmTopCommand'
import { LastFmWhoknowsAlbumCommand } from '~/modules/lastfm/commands/_fmWhoknowsAlbumCommand'
import { LastFmWhoknowsArtistCommand } from '~/modules/lastfm/commands/_fmWhoknowsArtistCommand'
import { LastFmWhoknowsTrackCommand } from '~/modules/lastfm/commands/_fmWhoknowsTrackCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('fm')
    .setDescription('Các lệnh liên quan đến Last.fm.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Liên kết tài khoản Last.fm của bạn.')
        .addStringOption((option) =>
          option
            .setName('username')
            .setDescription('Tên người dùng Last.fm của bạn.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('np')
        .setDescription('Hiển thị bài hát bạn đang nghe.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('artist')
        .setDescription('Hiển thị thông tin nghệ sĩ.')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Tên nghệ sĩ.')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Loại thông tin muốn xem.')
            .addChoices(
              { name: 'Tổng quan', value: 'overview' },
              { name: 'Top bài hát', value: 'toptracks' },
              { name: 'Top album', value: 'topalbums' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('album')
        .setDescription('Hiển thị thông tin album.')
        .addStringOption((option) =>
          option
            .setName('album')
            .setDescription('Tên album (để trống nếu muốn lấy từ NP).')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('artist')
            .setDescription('Tên nghệ sĩ (bắt buộc nếu cung cấp tên album).')
            .setRequired(false)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Loại thông tin muốn xem.')
            .addChoices(
              { name: 'Tổng quan', value: 'overview' },
              { name: 'Danh sách bài hát', value: 'tracklist' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('profile')
        .setDescription('Hiển thị hồ sơ Last.fm.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('recent')
        .setDescription('Xem danh sách các bài hát nghe gần đây nhất.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('milestone')
        .setDescription('Tìm bài hát tương ứng với số thứ tự lượt nghe.')
        .addIntegerOption((option) =>
          option
            .setName('number')
            .setDescription('Số thứ tự lượt nghe muốn tìm.')
            .setRequired(true)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('whoknows')
        .setDescription('Ai nghe nhiều nhất server?')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('artist')
            .setDescription('Ai nghe nghệ sĩ này nhiều nhất?')
            .addStringOption((option) =>
              option
                .setName('name')
                .setDescription('Tên nghệ sĩ (để trống nếu lấy từ NP).')
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('track')
            .setDescription('Ai nghe bài hát này nhiều nhất?')
            .addStringOption((option) =>
              option
                .setName('name')
                .setDescription('Tên bài hát (để trống nếu lấy từ NP).')
                .setRequired(false)
            )
            .addStringOption((option) =>
              option
                .setName('artist')
                .setDescription('Tên nghệ sĩ.')
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('album')
            .setDescription('Ai nghe album này nhiều nhất?')
            .addStringOption((option) =>
              option
                .setName('name')
                .setDescription('Tên album (để trống nếu lấy từ NP).')
                .setRequired(false)
            )
            .addStringOption((option) =>
              option
                .setName('artist')
                .setDescription('Tên nghệ sĩ.')
                .setRequired(false)
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('topartists')
        .setDescription('Xem những nghệ sĩ bạn nghe nhiều nhất.')
        .addStringOption((option) =>
          option
            .setName('period')
            .setDescription('Thời gian.')
            .addChoices(
              { name: '7 ngày qua', value: '7day' },
              { name: '1 tháng qua', value: '1month' },
              { name: '3 tháng qua', value: '3month' },
              { name: '6 tháng qua', value: '6month' },
              { name: '12 tháng qua', value: '12month' },
              { name: 'Tất cả thời gian', value: 'overall' }
            )
            .setRequired(false)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('chart')
        .setDescription('Tạo grid album nghe nhiều nhất.')
        .addStringOption((option) =>
          option
            .setName('period')
            .setDescription('Thời gian.')
            .addChoices(
              { name: '7 ngày qua', value: '7day' },
              { name: '1 tháng qua', value: '1month' },
              { name: '3 tháng qua', value: '3month' },
              { name: '6 tháng qua', value: '6month' },
              { name: '12 tháng qua', value: '12month' },
              { name: 'Tất cả thời gian', value: 'overall' }
            )
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('size')
            .setDescription('Kích thước grid (ví dụ: 3 cho 3x3). Tối đa 10.')
            .setRequired(false)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('topalbums')
        .setDescription('Xem những album bạn nghe nhiều nhất.')
        .addStringOption((option) =>
          option
            .setName('period')
            .setDescription('Thời gian.')
            .addChoices(
              { name: '7 ngày qua', value: '7day' },
              { name: '1 tháng qua', value: '1month' },
              { name: '3 tháng qua', value: '3month' },
              { name: '6 tháng qua', value: '6month' },
              { name: '12 tháng qua', value: '12month' },
              { name: 'Tất cả thời gian', value: 'overall' }
            )
            .setRequired(false)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toptracks')
        .setDescription('Xem những bài hát bạn nghe nhiều nhất.')
        .addStringOption((option) =>
          option
            .setName('period')
            .setDescription('Thời gian.')
            .addChoices(
              { name: '7 ngày qua', value: '7day' },
              { name: '1 tháng qua', value: '1month' },
              { name: '3 tháng qua', value: '3month' },
              { name: '6 tháng qua', value: '6month' },
              { name: '12 tháng qua', value: '12month' },
              { name: 'Tất cả thời gian', value: 'overall' }
            )
            .setRequired(false)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người dùng muốn xem.')
            .setRequired(false)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('server')
        .setDescription('Thống kê của toàn bộ server.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('np')
            .setDescription('Ai đang nghe gì trong server?')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('recent')
            .setDescription('Những bài hát mới nghe gần đây trong server.')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('leaderboard')
            .setDescription('Bảng xếp hạng lượt nghe trong server.')
        )
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'fm',
  description: 'Các lệnh liên quan đến Last.fm.',
  subcommands: [
    {
      name: 'set',
      chatInputRun: 'chatInputSet'
    },
    {
      name: 'np',
      chatInputRun: 'chatInputNowPlaying'
    },
    {
      name: 'artist',
      chatInputRun: 'chatInputArtist'
    },
    {
      name: 'album',
      chatInputRun: 'chatInputAlbum'
    },
    {
      name: 'profile',
      chatInputRun: 'chatInputProfile'
    },
    {
      name: 'milestone',
      chatInputRun: 'chatInputMilestone'
    },
    {
      name: 'recent',
      chatInputRun: 'chatInputRecent'
    },
    {
      name: 'whoknows',
      type: 'group',
      entries: [
        { name: 'artist', chatInputRun: 'chatInputWhoknows' },
        { name: 'track', chatInputRun: 'chatInputWhoknows' },
        { name: 'album', chatInputRun: 'chatInputWhoknows' }
      ]
    },
    {
      name: 'chart',
      chatInputRun: 'chatInputChart'
    },
    {
      name: 'topartists',
      chatInputRun: 'chatInputTopArtists'
    },
    {
      name: 'topalbums',
      chatInputRun: 'chatInputTopAlbums'
    },
    {
      name: 'toptracks',
      chatInputRun: 'chatInputTopTracks'
    },
    {
      name: 'server',
      type: 'group',
      entries: [
        { name: 'np', chatInputRun: 'chatInputServerNowPlaying' },
        { name: 'recent', chatInputRun: 'chatInputServerRecent' },
        { name: 'leaderboard', chatInputRun: 'chatInputServerLeaderboard' }
      ]
    }
  ]
})
export class LastFmSubcommand extends Subcommand {
  public async chatInputSet(interaction: ChatInputCommandInteraction) {
    return LastFmSetCommand.run(interaction)
  }

  public async chatInputNowPlaying(interaction: ChatInputCommandInteraction) {
    return LastFmNowPlayingCommand.run(interaction)
  }

  public async chatInputArtist(interaction: ChatInputCommandInteraction) {
    return LastFmArtistCommand.run(interaction)
  }

  public async chatInputAlbum(interaction: ChatInputCommandInteraction) {
    return LastFmAlbumCommand.run(interaction)
  }

  public async chatInputProfile(interaction: ChatInputCommandInteraction) {
    return LastFmProfileCommand.run(interaction)
  }

  public async chatInputMilestone(interaction: ChatInputCommandInteraction) {
    return LastFmMilestoneCommand.run(interaction)
  }

  public async chatInputRecent(interaction: ChatInputCommandInteraction) {
    return LastFmRecentCommand.run(interaction)
  }

  public async chatInputWhoknows(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand() as
      | 'artist'
      | 'track'
      | 'album'

    switch (subcommand) {
      case 'artist':
        return LastFmWhoknowsArtistCommand.run(interaction)
      case 'track':
        return LastFmWhoknowsTrackCommand.run(interaction)
      case 'album':
        return LastFmWhoknowsAlbumCommand.run(interaction)
    }
  }

  public async chatInputChart(interaction: ChatInputCommandInteraction) {
    return LastFmChartCommand.run(interaction)
  }

  public async chatInputTopArtists(interaction: ChatInputCommandInteraction) {
    return LastFmTopCommand.run(interaction, 'artists')
  }

  public async chatInputTopAlbums(interaction: ChatInputCommandInteraction) {
    return LastFmTopCommand.run(interaction, 'albums')
  }

  public async chatInputTopTracks(interaction: ChatInputCommandInteraction) {
    return LastFmTopCommand.run(interaction, 'tracks')
  }

  public async chatInputServerNowPlaying(
    interaction: ChatInputCommandInteraction
  ) {
    return LastFmServerCommand.runNowPlaying(interaction)
  }

  public async chatInputServerRecent(interaction: ChatInputCommandInteraction) {
    return LastFmServerCommand.runRecent(interaction)
  }

  public async chatInputServerLeaderboard(
    interaction: ChatInputCommandInteraction
  ) {
    return LastFmServerCommand.runLeaderboard(interaction)
  }
}
