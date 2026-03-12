import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { VietnameseWordChainAddCommand } from '~/modules/vietnamese-word-chain/commands/_vietnameseWordChainAddCommand'
import { VietnameseWordChainHintCommand } from '~/modules/vietnamese-word-chain/commands/_vietnameseWordChainHintCommand'
import { VietnameseWordChainPauseCommand } from '~/modules/vietnamese-word-chain/commands/_vietnameseWordChainPauseCommand'
import { VietnameseWordChainStartCommand } from '~/modules/vietnamese-word-chain/commands/_vietnameseWordChainStartCommand'
import { VietnameseWordChainUnpauseCommand } from '~/modules/vietnamese-word-chain/commands/_vietnameseWordChainUnpauseCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('viwordchain')
    .setDescription('Quản lý trò chơi nối từ tiếng Việt.')
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
      sub
        .setName('hint')
        .setDescription('Lấy gợi ý từ tiếp theo (tối đa 3 lần/ván).')
    )
    .addSubcommand((sub) =>
      sub.setName('add').setDescription('[ADMIN] Thêm từ vựng mới vào từ điển.')
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'viwordchain',
  description: 'Quản lý trò chơi nối từ tiếng Việt.',
  subcommands: [
    {
      name: 'start',
      chatInputRun: 'chatInputStart',
      preconditions: ['OwnerOnly', 'VietnameseWordChainChannelOnly']
    },
    {
      name: 'pause',
      chatInputRun: 'chatInputPause',
      preconditions: ['OwnerOnly', 'VietnameseWordChainChannelOnly']
    },
    {
      name: 'unpause',
      chatInputRun: 'chatInputUnpause',
      preconditions: ['OwnerOnly', 'VietnameseWordChainChannelOnly']
    },
    {
      name: 'hint',
      chatInputRun: 'chatInputHint',
      preconditions: ['VietnameseWordChainChannelOnly']
    },
    {
      name: 'add',
      chatInputRun: 'chatInputAdd',
      preconditions: ['OwnerOnly']
    }
  ]
})
export class VietnameseWordChainSubcommand extends Subcommand {
  public async chatInputStart(interaction: ChatInputCommandInteraction) {
    return VietnameseWordChainStartCommand.run(interaction)
  }

  public async chatInputPause(interaction: ChatInputCommandInteraction) {
    return VietnameseWordChainPauseCommand.run(interaction)
  }

  public async chatInputUnpause(interaction: ChatInputCommandInteraction) {
    return VietnameseWordChainUnpauseCommand.run(interaction)
  }

  public async chatInputHint(interaction: ChatInputCommandInteraction) {
    return VietnameseWordChainHintCommand.run(interaction)
  }

  public async chatInputAdd(interaction: ChatInputCommandInteraction) {
    return VietnameseWordChainAddCommand.run(interaction)
  }
}
