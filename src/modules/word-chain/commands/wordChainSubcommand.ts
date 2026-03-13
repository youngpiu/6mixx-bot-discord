import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'

import { WordChainAddCommand } from '~/modules/word-chain/commands/_wordChainAddCommand'
import { WordChainHintCommand } from '~/modules/word-chain/commands/_wordChainHintCommand'
import { WordChainPauseCommand } from '~/modules/word-chain/commands/_wordChainPauseCommand'
import { WordChainStartCommand } from '~/modules/word-chain/commands/_wordChainStartCommand'
import { WordChainUnpauseCommand } from '~/modules/word-chain/commands/_wordChainUnpauseCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('wordchain')
    .setDescription('Quản lý trò chơi nối từ.')
    .addSubcommand((sub) =>
      sub.setName('start').setDescription('[ADMIN] Bắt đầu ván nối từ mới.')
    )
    .addSubcommand((sub) =>
      sub.setName('pause').setDescription('[ADMIN] Tạm dừng ván nối từ.')
    )
    .addSubcommand((sub) =>
      sub.setName('unpause').setDescription('[ADMIN] Tiếp tục ván nối từ.')
    )
    .addSubcommand((sub) =>
      sub.setName('hint').setDescription('Lấy gợi ý từ tiếp theo.')
    )
    .addSubcommand((sub) =>
      sub.setName('add').setDescription('[ADMIN] Thêm từ vựng mới vào từ điển.')
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'wordchain',
  description: 'Quản lý trò chơi nối từ.',
  runIn: [ChannelType.GuildText],
  subcommands: [
    {
      name: 'start',
      chatInputRun: 'chatInputStart',
      requiredUserPermissions: ['Administrator'],
      preconditions: ['WordChainChannelOnly']
    },
    {
      name: 'pause',
      chatInputRun: 'chatInputPause',
      requiredUserPermissions: ['Administrator'],
      preconditions: ['WordChainChannelOnly']
    },
    {
      name: 'unpause',
      chatInputRun: 'chatInputUnpause',
      requiredUserPermissions: ['Administrator'],
      preconditions: ['WordChainChannelOnly']
    },
    {
      name: 'hint',
      chatInputRun: 'chatInputHint',
      preconditions: ['WordChainChannelOnly']
    },
    {
      name: 'add',
      chatInputRun: 'chatInputAdd',
      preconditions: ['WordChainChannelOnly']
    }
  ]
})
export class WordChainSubcommand extends Subcommand {
  public async chatInputStart(interaction: ChatInputCommandInteraction) {
    return WordChainStartCommand.run(interaction)
  }

  public async chatInputPause(interaction: ChatInputCommandInteraction) {
    return WordChainPauseCommand.run(interaction)
  }

  public async chatInputUnpause(interaction: ChatInputCommandInteraction) {
    return WordChainUnpauseCommand.run(interaction)
  }

  public async chatInputHint(interaction: ChatInputCommandInteraction) {
    return WordChainHintCommand.run(interaction)
  }

  public async chatInputAdd(interaction: ChatInputCommandInteraction) {
    return WordChainAddCommand.run(interaction)
  }
}
