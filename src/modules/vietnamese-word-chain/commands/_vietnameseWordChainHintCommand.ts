import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { VietnameseWordChainRedisService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainRedisService'

export class VietnameseWordChainHintCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const guildId = interaction.guild.id
    const userId = interaction.user.id

    // 1. Get current state
    const state = await VietnameseWordChainRedisService.getState(guildId)
    if (!state) {
      return InteractionUtil.replyError(
        interaction,
        'Không có ván nối từ nào đang diễn ra.'
      )
    }

    if (state.status === 'paused') {
      return InteractionUtil.replyError(
        interaction,
        'Ván nối từ đang tạm dừng, không thể dùng gợi ý.'
      )
    }

    // 2. Check hint limit (3 uses per player)
    if (!state.hintsUsed) state.hintsUsed = {}
    const usedCount = state.hintsUsed[userId] ?? 0
    if (usedCount >= 3) {
      return InteractionUtil.replyError(
        interaction,
        'Bạn đã hết lượt gợi ý trong ván này (tối đa 3 lần).'
      )
    }

    // 3. Find a random hint word from dictionary
    // We get a random word from Redis that starts with currentLastWord,
    // and keep trying if it is already in usedWords.
    
    let hintPhrase: string | null = null
    const MAX_ATTEMPTS = 10 // avoid infinite loop if almost all words are used
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const randomWord = await VietnameseWordChainRedisService.getRandomStartingWith(state.currentLastWord)
        if (!randomWord) break // no words at all for this starting word

        if (!state.usedWords.includes(randomWord)) {
            hintPhrase = randomWord
            break
        }
    }

    if (!hintPhrase) {
      return InteractionUtil.replyError(
        interaction,
        'Không thể tìm thấy từ nào để gợi ý. Có vẻ như ván game sắp kết thúc!'
      )
    }

    // 4. Update usage count in Redis
    state.hintsUsed[userId] = usedCount + 1
    await VietnameseWordChainRedisService.setState(guildId, state)

    // 5. Reply with hint
    const remaining = 3 - (usedCount + 1)
    await InteractionUtil.replySuccess(
      interaction,
      `Gợi ý cho bạn: \`${hintPhrase}\``,
      `Bạn còn **${remaining}** lần dùng gợi ý trong ván này.`
    )
  }
}
