import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { MusicQuizAddSongCommand } from './_quizzAddSongCommand'
import { MusicQuizSongsCommand } from './_quizzSongsCommand'
import { MusicQuizTopCommand } from './_quizzTopCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('quizz')
    .setDescription('Quản lý hệ thống Music Quiz.')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm một bài hát mới vào Quiz.')
        .addStringOption((option) =>
          option
            .setName('album')
            .setDescription('Tên album của bài hát.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('singer')
            .setDescription('Nghệ sĩ thể hiện.')
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
            .setDescription('Đường dẫn thư mục (vd: /album/ten-bai).')
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
  name: 'quizz',
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
export class QuizzSubcommand extends Subcommand {
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
