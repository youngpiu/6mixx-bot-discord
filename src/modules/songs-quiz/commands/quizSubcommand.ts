import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { MusicQuizAddSongCommand } from '~/modules/songs-quiz/commands/_quizAddSongCommand'
import { MusicQuizSongsCommand } from '~/modules/songs-quiz/commands/_quizSongsCommand'
import { MusicQuizTopCommand } from '~/modules/songs-quiz/commands/_quizTopCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('quiz')
    .setDescription('Quản lý hệ thống Music Quiz.')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm một bài hát mới vào Quiz.')
        .addStringOption((option) =>
          option
            .setName('playlist')
            .setDescription('Tên danh sách phát của bài hát.')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('artists')
            .setDescription('Danh sách các nghệ sĩ thể hiện.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('title')
            .setDescription('Tên chính thức của bài hát.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('aliases')
            .setDescription('Các tên gọi khác (phân cách bằng dấu phẩy).')
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('duration')
            .setDescription('Độ dài bài hát (giây).')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('path')
            .setDescription('Đường dẫn thư mục (vd: /playlist/ten-bai).')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('song-url')
            .setDescription('Link bài hát (YouTube, Spotify, ...).')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('top')
        .setDescription('Xem bảng xếp hạng những người có nhiều kỷ lục nhất.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('songs')
        .setDescription('Xem danh sách kỷ lục của từng bài hát.')
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'quiz',
  description: 'Quản lý Music Quiz.',
  preconditions: ['GuildOnly'],
  subcommands: [
    {
      name: 'add',
      chatInputRun: 'chatInputAddSong',
      preconditions: ['OwnerOnly']
    },
    {
      name: 'top',
      chatInputRun: 'chatInputTop'
    },
    {
      name: 'songs',
      chatInputRun: 'chatInputSongs'
    }
  ]
})
export class QuizSubcommand extends Subcommand {
  public async chatInputAddSong(interaction: ChatInputCommandInteraction) {
    return MusicQuizAddSongCommand.run(interaction)
  }

  public async chatInputTop(interaction: ChatInputCommandInteraction) {
    return MusicQuizTopCommand.run(interaction)
  }

  public async chatInputSongs(interaction: ChatInputCommandInteraction) {
    return MusicQuizSongsCommand.run(interaction)
  }
}
