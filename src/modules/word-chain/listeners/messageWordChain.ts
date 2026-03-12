import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Message } from 'discord.js'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'
import { TIME } from '~/shared/constants/timeConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { getNumberEmojiIds } from '~/shared/utils/emojiUtil'
import { MessageUtil } from '~/shared/utils/messageUtil'

import {
  type WordChainMode,
  WordChainRedisService
} from '~/modules/word-chain/services/WordChainRedisService'
import { WordChainService } from '~/modules/word-chain/services/WordChainService'

@ApplyOptions<Listener.Options>({
  event: 'messageCreate'
})
export class MessageWordChainListener extends Listener {
  public async run(message: Message) {
    // Ignore bots
    if (message.author.bot) return
    if (!message.guild) return

    const guildId = message.guild.id

    // 1. Get channel setting and determine mode
    const setting = await SettingRepository.find(guildId)
    if (!setting) return

    let mode: WordChainMode | null = null
    if (message.channelId === setting.vietnameseWordChainChannelId) {
      mode = 'vi'
    } else if (message.channelId === setting.englishWordChainChannelId) {
      mode = 'en'
    }
    if (!mode) return

    // 2. Get Redis state — silently ignore if no game or paused
    const state = await WordChainRedisService.getState(guildId, mode)
    if (!state || state.status === 'paused') return

    // 3. Parse input based on mode
    const input = message.content.trim().toLowerCase()

    if (mode === 'vi') {
      await this.handleVietnamese(message, guildId, input)
    } else {
      await this.handleEnglish(message, guildId, input)
    }
  }

  private async handleVietnamese(
    message: Message,
    guildId: string,
    input: string
  ) {
    const words = input.split(/\s+/)
    if (words.length !== 2) return

    const acquired = await WordChainRedisService.acquireLock(guildId, 'vi')
    if (!acquired) return

    try {
      const freshState = await WordChainRedisService.getState(guildId, 'vi')
      if (!freshState || freshState.status === 'paused') return

      const userId = message.author.id

      // Check consecutive answer
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

      // Check chain connection (O(1), No I/O)
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

      // Lookup phrase in dictionary
      const exists = await WordChainRedisService.hasViPhrase(input)
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

      // Check already used (Vietnamese does NOT allow reuse)
      if ((freshState.usedWords[words[0]] ?? []).includes(input)) {
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
      await message.react(STATIC_EMOJI.VERIFIED).catch(() => null)

      // Update state
      const group = freshState.usedWords[words[0]] ?? []
      group.push(input)
      freshState.usedWords[words[0]] = group
      freshState.currentLastWord = words[1]
      freshState.playersScore[userId] =
        (freshState.playersScore[userId] ?? 0) + 1
      freshState.totalWords = (freshState.totalWords ?? 0) + 1
      freshState.lastPlayerId = userId

      await WordChainRedisService.setState(guildId, 'vi', freshState)

      // React with word count number emojis
      const emojiIds = getNumberEmojiIds(freshState.totalWords)
      for (const id of emojiIds) {
        await message.react(id).catch(() => null)
      }

      // Check game over
      const totalWordsWithLastWord =
        await WordChainRedisService.countViStartingWith(words[1])

      // O(1) game-over check: how many used words start with words[1]
      const usedWordsWithLastWord = (freshState.usedWords[words[1]] ?? [])
        .length

      const remainingCount = totalWordsWithLastWord - usedWordsWithLastWord

      if (remainingCount === 0) {
        await WordChainService.endGame(
          message.guild!,
          message.channelId,
          'vi',
          freshState.sessionId,
          freshState.playersScore
        )
      }
    } finally {
      await WordChainRedisService.releaseLock(guildId, 'vi')
    }
  }

  private async handleEnglish(
    message: Message,
    guildId: string,
    input: string
  ) {
    const words = input.split(/\s+/)
    if (words.length !== 1) return

    const word = words[0]

    const acquired = await WordChainRedisService.acquireLock(guildId, 'en')
    if (!acquired) return

    try {
      const freshState = await WordChainRedisService.getState(guildId, 'en')
      if (!freshState || freshState.status === 'paused') return

      const userId = message.author.id

      // Check consecutive answer
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

      // Check chain connection: first letter must match currentLastWord (which is a letter)
      if (word[0] !== freshState.currentLastWord) {
        await message.react(STATIC_EMOJI.UNVERIFIED).catch(() => null)
        await MessageUtil.replyError(
          message,
          `Từ phải bắt đầu bằng chữ cái \`${freshState.currentLastWord.toUpperCase()}\`.`,
          TIME.S3,
          'NORMAL',
          false
        )
        return
      }

      // Lookup word in dictionary
      const exists = await WordChainRedisService.hasEnWord(word)
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

      // English allows reuse — no usedWords check

      // ─── Valid word ───────────────────────────────────────────
      const lastLetter = word[word.length - 1]
      const isRepeat = (freshState.usedWords[word[0]] ?? []).includes(word)

      // Update state
      const enGroup = freshState.usedWords[word[0]] ?? []
      if (!isRepeat) enGroup.push(word)
      freshState.usedWords[word[0]] = enGroup
      freshState.currentLastWord = lastLetter
      freshState.playersScore[userId] =
        (freshState.playersScore[userId] ?? 0) + 1
      freshState.totalWords = (freshState.totalWords ?? 0) + 1
      freshState.lastPlayerId = userId

      await WordChainRedisService.setState(guildId, 'en', freshState)

      // React: LOOP if repeated word, VERIFIED if new; then show word count
      await message
        .react(isRepeat ? STATIC_EMOJI.LOOP : STATIC_EMOJI.VERIFIED)
        .catch(() => null)
      const emojiIds = getNumberEmojiIds(freshState.totalWords)
      for (const id of emojiIds) {
        await message.react(id).catch(() => null)
      }

      // Check game over: if no words start with this letter
      const remainingCount =
        await WordChainRedisService.countEnStartingWith(lastLetter)

      if (remainingCount === 0) {
        await WordChainService.endGame(
          message.guild!,
          message.channelId,
          'en',
          freshState.sessionId,
          freshState.playersScore
        )
      }
    } finally {
      await WordChainRedisService.releaseLock(guildId, 'en')
    }
  }
}
