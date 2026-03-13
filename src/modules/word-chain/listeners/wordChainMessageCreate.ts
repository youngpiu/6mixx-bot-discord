import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Events, Message } from 'discord.js'

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
  event: Events.MessageCreate
})
export class WordChainMessageCreateListener extends Listener {
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
    const setting = await SettingRepository.find(guildId)
    if (!setting) return null

    if (channelId === setting.vietnameseWordChainChannelId) return 'vi'
    if (channelId === setting.englishWordChainChannelId) return 'en'
    return null
  }

  private async reject(message: Message, content: string) {
    await message.react(STATIC_EMOJI.UNVERIFIED).catch(() => null)
    await MessageUtil.replyError(message, content, TIME.S2, 'NORMAL', false)
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

    const result = await WordChainRedisService.submitVietnameseWord(
      guildId,
      message.author.id,
      firstWord,
      input,
      lastWord
    )

    switch (result.status) {
      case 'no_state':
      case 'paused':
        return
      case 'same_player':
        await this.reject(
          message,
          'Bạn không thể nối 2 lần liên tiếp, hãy đợi người chơi khác.'
        )
        return
      case 'invalid_chain':
        await this.reject(message, `Từ bắt đầu phải là \`${result.expected}\`.`)
        return
      case 'not_in_dictionary':
        await this.reject(message, 'Từ này không có trong từ điển.')
        return
      case 'already_used':
        await this.reject(message, 'Từ này đã được sử dụng rồi.')
        return
      case 'ok':
        break
    }

    // ─── Valid word ───────────────────────────────────────────
    await message.react(STATIC_EMOJI.VERIFIED).catch(() => null)
    this.reactWordCount(message, result.totalWords)

    if (result.remainingCount === 0) {
      const finalState = await WordChainRedisService.getState(guildId, 'vi')
      if (!finalState) return

      await WordChainService.endGame(
        message.guild!,
        message.channelId,
        'vi',
        finalState.sessionId,
        finalState.playersScore
      )
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

    const firstLetter = word[0]
    const lastLetter = word[word.length - 1]

    const result = await WordChainRedisService.submitEnglishWord(
      guildId,
      message.author.id,
      firstLetter,
      word,
      lastLetter
    )

    switch (result.status) {
      case 'no_state':
      case 'paused':
        return
      case 'same_player':
        await this.reject(
          message,
          'Bạn không thể nối 2 lần liên tiếp, hãy đợi người chơi khác.'
        )
        return
      case 'invalid_chain':
        await this.reject(
          message,
          `Từ phải bắt đầu bằng chữ cái \`${result.expected.toUpperCase()}\`.`
        )
        return
      case 'not_in_dictionary':
        await this.reject(message, 'Từ này không có trong từ điển.')
        return
      case 'ok':
        break
    }

    // ─── Valid word ───────────────────────────────────────────
    await message
      .react(result.isRepeat ? STATIC_EMOJI.LOOP : STATIC_EMOJI.VERIFIED)
      .catch(() => null)
    this.reactWordCount(message, result.totalWords)

    if (result.remainingCount === 0) {
      const finalState = await WordChainRedisService.getState(guildId, 'en')
      if (!finalState) return

      await WordChainService.endGame(
        message.guild!,
        message.channelId,
        'en',
        finalState.sessionId,
        finalState.playersScore
      )
    }
  }
}
