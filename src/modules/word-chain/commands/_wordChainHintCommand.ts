import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import {
  type WordChainMode,
  WordChainRedisService
} from '~/modules/word-chain/services/WordChainRedisService'

export class WordChainHintCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const guildId = interaction.guild.id
    const userId = interaction.user.id
    const mode = await this.detectMode(guildId, interaction.channelId)
    if (!mode) {
      throw new NormalError('Kênh này không phải kênh nối từ.')
    }

    // 1. Get current state
    const state = await WordChainRedisService.getState(guildId, mode)
    if (!state) {
      throw new NormalError('Không có ván nối từ nào đang diễn ra.')
    }

    if (state.status === 'paused') {
      throw new NormalError('Ván nối từ đang tạm dừng, không thể dùng gợi ý.')
    }

    // 2. Check hint limit (3 uses per player)
    if (!state.hintsUsed) state.hintsUsed = {}
    const usedCount = state.hintsUsed[userId] ?? 0
    if (usedCount >= 3) {
      throw new NormalError(
        'Bạn đã hết lượt gợi ý trong ván này (tối đa 3 lần).'
      )
    }

    // 3. Find a random hint word from dictionary
    let hintWord: string | null = null
    const MAX_ATTEMPTS = 10

    if (mode === 'vi') {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const randomWord = await WordChainRedisService.getRandomViStartingWith(
          state.currentLastWord
        )
        if (!randomWord) break
        if (
          !(state.usedWords[randomWord.split(' ')[0]] ?? []).includes(
            randomWord
          )
        ) {
          hintWord = randomWord
          break
        }
      }
    } else {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const randomWord = await WordChainRedisService.getRandomEnStartingWith(
          state.currentLastWord
        )
        if (!randomWord) break
        // English allows reuse, so any word is valid as hint
        hintWord = randomWord
        break
      }
    }

    if (!hintWord) {
      throw new NormalError(
        'Không thể tìm thấy từ nào để gợi ý. Có vẻ như ván game sắp kết thúc!'
      )
    }

    // 4. Update usage count in Redis
    state.hintsUsed[userId] = usedCount + 1
    await WordChainRedisService.setState(guildId, mode, state)

    // 5. Reply with hint
    const remaining = 3 - (usedCount + 1)
    await InteractionUtil.replySuccess(
      interaction,
      `Gợi ý cho bạn: \`${hintWord}\``,
      `Bạn còn **${remaining}** lần dùng gợi ý trong ván này.`
    )
  }

  private static async detectMode(
    guildId: string,
    channelId: string
  ): Promise<WordChainMode | null> {
    const setting = await SettingRepository.find(guildId)
    if (!setting) return null
    if (channelId === setting.vietnameseWordChainChannelId) return 'vi'
    if (channelId === setting.englishWordChainChannelId) return 'en'
    return null
  }
}
