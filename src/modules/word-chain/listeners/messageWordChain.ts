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
  private static readonly SETTING_CACHE_TTL_MS = 30_000

  private static readonly settingCache = new Map<
    string,
    {
      expiresAt: number
      viChannelId: string | null
      enChannelId: string | null
    }
  >()

  public async run(message: Message) {
    // Ignore bots
    if (message.author.bot) return
    if (!message.guild) return

    const guildId = message.guild.id
    const input = message.content.trim().toLowerCase()
    if (!input) return

    const mode = await this.resolveMode(guildId, message.channelId)
    if (!mode) return

    if (mode === 'vi') {
      await this.handleVietnamese(message, guildId, input)
    } else {
      await this.handleEnglish(message, guildId, input)
    }
  }

  private async resolveMode(
    guildId: string,
    channelId: string
  ): Promise<WordChainMode | null> {
    const now = Date.now()
    const cached = MessageWordChainListener.settingCache.get(guildId)
    if (cached && cached.expiresAt > now) {
      if (channelId === cached.viChannelId) return 'vi'
      if (channelId === cached.enChannelId) return 'en'
      return null
    }

    const setting = await SettingRepository.find(guildId)
    if (!setting) return null

    MessageWordChainListener.settingCache.set(guildId, {
      expiresAt: now + MessageWordChainListener.SETTING_CACHE_TTL_MS,
      viChannelId: setting.vietnameseWordChainChannelId,
      enChannelId: setting.englishWordChainChannelId
    })

    if (channelId === setting.vietnameseWordChainChannelId) return 'vi'
    if (channelId === setting.englishWordChainChannelId) return 'en'
    return null
  }

  private async reject(message: Message, content: string) {
    await message.react(STATIC_EMOJI.UNVERIFIED).catch(() => null)
    await MessageUtil.replyError(message, content, TIME.S3, 'NORMAL', false)
  }

  private reactWordCount(message: Message, totalWords: number) {
    const emojiIds = getNumberEmojiIds(totalWords)

    // Fire-and-forget to avoid blocking the hot path, while keeping order.
    void (async () => {
      for (const id of emojiIds) {
        await message.react(id).catch(() => null)
      }
    })()
  }

  private async handleVietnamese(
    message: Message,
    guildId: string,
    input: string
  ) {
    const words = input.split(/\s+/)
    if (words.length !== 2) return
    const firstWord = words[0]
    const lastWord = words[1]

    const acquired = await WordChainRedisService.acquireLock(guildId, 'vi')
    if (!acquired) return

    try {
      const freshState = await WordChainRedisService.getState(guildId, 'vi')
      if (!freshState || freshState.status === 'paused') return

      const userId = message.author.id

      // Check consecutive answer
      if (freshState.lastPlayerId === userId) {
        await this.reject(
          message,
          'Bạn không thể nối 2 lần liên tiếp, hãy đợi người chơi khác.'
        )
        return
      }

      // Check chain connection (O(1), No I/O)
      if (firstWord !== freshState.currentLastWord) {
        await this.reject(
          message,
          `Từ bắt đầu phải là \`${freshState.currentLastWord}\`.`
        )
        return
      }

      // Lookup phrase in dictionary
      const exists = await WordChainRedisService.hasViPhraseInGroup(
        firstWord,
        input
      )
      if (!exists) {
        await this.reject(message, 'Từ này không có trong từ điển.')
        return
      }

      // Check already used (Vietnamese does NOT allow reuse)
      const groupIndex = freshState.usedWordIndex[firstWord] ?? {}
      if (groupIndex[input]) {
        await this.reject(message, 'Từ này đã được sử dụng rồi.')
        return
      }

      // ─── Valid word ───────────────────────────────────────────
      await message.react(STATIC_EMOJI.VERIFIED).catch(() => null)

      // Update state
      groupIndex[input] = true
      freshState.usedWordIndex[firstWord] = groupIndex
      freshState.usedWordCountByGroup[firstWord] =
        (freshState.usedWordCountByGroup[firstWord] ?? 0) + 1
      freshState.currentLastWord = lastWord
      freshState.playersScore[userId] =
        (freshState.playersScore[userId] ?? 0) + 1
      freshState.totalWords = (freshState.totalWords ?? 0) + 1
      freshState.lastPlayerId = userId

      await WordChainRedisService.setState(guildId, 'vi', freshState)
      const totalWordsWithLastWordPromise =
        WordChainRedisService.countViStartingWith(lastWord)

      // React with word count number emojis
      this.reactWordCount(message, freshState.totalWords)

      // Check game over
      const totalWordsWithLastWord = await totalWordsWithLastWordPromise

      // O(1) game-over check: how many used words start with lastWord
      const usedWordsWithLastWord =
        freshState.usedWordCountByGroup[lastWord] ?? 0

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
        await this.reject(
          message,
          'Bạn không thể nối 2 lần liên tiếp, hãy đợi người chơi khác.'
        )
        return
      }

      // Check chain connection: first letter must match currentLastWord (which is a letter)
      if (word[0] !== freshState.currentLastWord) {
        await this.reject(
          message,
          `Từ phải bắt đầu bằng chữ cái \`${freshState.currentLastWord.toUpperCase()}\`.`
        )
        return
      }

      // Lookup word in dictionary
      const exists = await WordChainRedisService.hasEnWordInGroup(word[0], word)
      if (!exists) {
        await this.reject(message, 'Từ này không có trong từ điển.')
        return
      }

      // English allows reuse — no usedWords check

      // ─── Valid word ───────────────────────────────────────────
      const lastLetter = word[word.length - 1]
      const firstLetter = word[0]
      const enGroupIndex = freshState.usedWordIndex[firstLetter] ?? {}
      const isRepeat = Boolean(enGroupIndex[word])

      // Update state
      if (!isRepeat) {
        enGroupIndex[word] = true
        freshState.usedWordCountByGroup[firstLetter] =
          (freshState.usedWordCountByGroup[firstLetter] ?? 0) + 1
      }
      freshState.usedWordIndex[firstLetter] = enGroupIndex
      freshState.currentLastWord = lastLetter
      freshState.playersScore[userId] =
        (freshState.playersScore[userId] ?? 0) + 1
      freshState.totalWords = (freshState.totalWords ?? 0) + 1
      freshState.lastPlayerId = userId

      await WordChainRedisService.setState(guildId, 'en', freshState)
      const remainingCountPromise =
        WordChainRedisService.countEnStartingWith(lastLetter)

      // React: LOOP if repeated word, VERIFIED if new; then show word count
      await message
        .react(isRepeat ? STATIC_EMOJI.LOOP : STATIC_EMOJI.VERIFIED)
        .catch(() => null)
      this.reactWordCount(message, freshState.totalWords)

      // Check game over: if no words start with this letter
      const remainingCount = await remainingCountPromise

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
