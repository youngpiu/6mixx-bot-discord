import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Message } from 'discord.js'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'
import { TIME } from '~/shared/constants/timeConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { MessageUtil } from '~/shared/utils/messageUtil'

import { VietnameseWordChainRedisService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainRedisService'
import { VietnameseWordChainService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainService'

@ApplyOptions<Listener.Options>({
  event: 'messageCreate'
})
export class MessageVietnameseWordChainListener extends Listener {
  public async run(message: Message) {
    // Ignore bots
    if (message.author.bot) return
    if (!message.guild) return

    const guildId = message.guild.id

    // 1. Get channel setting
    const setting = await SettingRepository.find(guildId)
    if (!setting?.wordChainChannelId) return
    if (message.channelId !== setting.wordChainChannelId) return

    // 2. Get Redis state — silently ignore if no game or paused
    const state = await VietnameseWordChainRedisService.getState(guildId)
    if (!state || state.status === 'paused') return

    // 3. Check message is exactly 2 words
    const input = message.content.trim().toLowerCase()
    const words = input.split(/\s+/)
    if (words.length !== 2) return

    // ─────────────────────────────────────────────────────────────
    // Distributed lock: process one message per guild at a time.
    // Messages that arrive while another is processing are silently
    // dropped (Discord's natural ordering handles FIFO for us).
    // ─────────────────────────────────────────────────────────────
    const acquired = await VietnameseWordChainRedisService.acquireLock(guildId)
    if (!acquired) return

    try {
      // Re-fetch state inside the lock to get latest values
      const freshState = await VietnameseWordChainRedisService.getState(guildId)
      if (!freshState || freshState.status === 'paused') return

      const userId = message.author.id

      // 3.5. Check consecutive answer
      if (freshState.lastPlayerId === userId) {
        await message.react(STATIC_EMOJI.UNVERIFIED).catch(() => null)
        await MessageUtil.replyError(
          message,
          'Bạn không thể nối 2 lần liên tiếp, hãy đợi người chơi khác.',
          TIME.S3,
          'NORMAL',
          false
        )
        return
      }

      // 4. Check chain connection first (O(1), No I/O)
      if (words[0] !== freshState.currentLastWord) {
        await message.react(STATIC_EMOJI.UNVERIFIED).catch(() => null)
        await MessageUtil.replyError(
          message,
          `Từ bắt đầu phải là \`${freshState.currentLastWord}\`.`,
          TIME.S3,
          'NORMAL',
          false
        )
        return
      }

      // 5. Lookup phrase in dictionary
      const exists = await VietnameseWordChainRedisService.hasPhrase(input)
      if (!exists) {
        await message.react(STATIC_EMOJI.UNVERIFIED).catch(() => null)
        await MessageUtil.replyError(
          message,
          'Từ này không có trong từ điển.',
          TIME.S3,
          'NORMAL',
          false
        )
        return
      }

      // 6. Check already used
      if (freshState.usedWords.includes(input)) {
        await message.react(STATIC_EMOJI.UNVERIFIED).catch(() => null)
        await MessageUtil.replyError(
          message,
          'Từ này đã được sử dụng rồi.',
          TIME.S3,
          'NORMAL',
          false
        )
        return
      }

      // ─── Valid word ───────────────────────────────────────────

      // 7. React success
      await message.react(STATIC_EMOJI.VERIFIED).catch(() => null)

      // 8. Update state
      freshState.usedWords.push(input)
      freshState.currentLastWord = words[1]
      freshState.playersScore[userId] =
        (freshState.playersScore[userId] ?? 0) + 1
      freshState.lastPlayerId = userId

      await VietnameseWordChainRedisService.setState(guildId, freshState)

      // 9. Check game over: any remaining phrase with currentLastWord that hasn't been used
      const totalWordsWithLastWord =
        await VietnameseWordChainRedisService.countStartingWith(words[1])

      // Count how many of the usedWords start with `words[1]`
      const usedWordsWithLastWord = freshState.usedWords.filter((w) =>
        w.startsWith(`${words[1]} `)
      ).length

      const remainingCount = totalWordsWithLastWord - usedWordsWithLastWord

      if (remainingCount === 0) {
        await VietnameseWordChainService.endGame(
          message.guild,
          message.channelId,
          freshState.sessionId,
          freshState.playersScore
        )
      }
    } finally {
      await VietnameseWordChainRedisService.releaseLock(guildId)
    }
  }
}
