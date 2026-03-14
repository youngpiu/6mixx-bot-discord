import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { WordChainRepository } from '~/modules/word-chain/repositories/WordChainRepository'
import { WordChainRedisService } from '~/modules/word-chain/services/WordChainRedisService'
import { WordChainService } from '~/modules/word-chain/services/WordChainService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalWordChainAddWord extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.MODAL_WORDCHAIN_ADD_VI &&
      interaction.customId !== CUSTOM_ID.MODAL_WORDCHAIN_ADD_EN
    ) {
      return this.none()
    }

    return this.some({
      isEnglish: interaction.customId === CUSTOM_ID.MODAL_WORDCHAIN_ADD_EN
    })
  }

  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { isEnglish } = result
    const input = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_WORDCHAIN_PHRASES
    )
    const lines = input
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l.length > 0)

    if (lines.length === 0) {
      throw new NormalError('Vui lòng nhập ít nhất một từ.')
    }

    if (isEnglish) {
      await this.handleEnglish(interaction, lines)
    } else {
      await this.handleVietnamese(interaction, lines)
    }
  }

  private async handleVietnamese(
    interaction: ModalSubmitInteraction,
    lines: string[]
  ) {
    const validPhrases: string[] = []
    const invalidLines: string[] = []

    for (const line of lines) {
      const words = line.split(/\s+/)
      if (words.length === 2) {
        validPhrases.push(line)
      } else {
        invalidLines.push(line)
      }
    }

    if (validPhrases.length === 0) {
      throw new NormalError(
        'Không có từ nào hợp lệ (phải gồm đúng 2 từ cách nhau bởi khoảng trắng).'
      )
    }

    try {
      const existing =
        await WordChainRedisService.checkExistingViPhrases(validPhrases)
      const toAdd = validPhrases.filter((p) => !existing.includes(p))

      if (toAdd.length > 0) {
        await WordChainRepository.addViPhrases(toAdd)
        await WordChainService.initViDictionary(true)
      }

      const title =
        toAdd.length > 0
          ? 'Đã thêm thành công các từ mới.'
          : 'Không có từ mới nào được thêm.'
      let description = ''

      if (toAdd.length > 0) {
        description += `- Đã thêm: ${toAdd.map((p) => `\`${p}\``).join(', ')}.`
      }

      if (existing.length > 0) {
        if (description) description += '\n'
        description += `- Trùng lặp: ${existing.map((p) => `\`${p}\``).join(', ')}.`
      }

      if (invalidLines.length > 0) {
        if (description) description += '\n'
        description += `- Không hợp lệ: ${invalidLines.map((l) => `\`${l}\``).join(', ')}.`
      }

      await InteractionUtil.replySuccess(interaction, title, description)
    } catch (error) {
      if (error instanceof NormalError) throw error
      this.container.logger.error(
        '[WordChainAdd] Failed to add Vietnamese phrases:',
        error
      )
      throw new NormalError('Đã xảy ra lỗi khi thêm từ vào hệ thống.')
    }
  }

  private async handleEnglish(
    interaction: ModalSubmitInteraction,
    lines: string[]
  ) {
    const validWords: string[] = []
    const invalidLines: string[] = []

    for (const line of lines) {
      const words = line.split(/\s+/)
      if (words.length === 1 && /^[a-z]+$/.test(words[0])) {
        validWords.push(words[0])
      } else {
        invalidLines.push(line)
      }
    }

    if (validWords.length === 0) {
      throw new NormalError(
        'Không có từ nào hợp lệ (mỗi dòng phải là một từ tiếng Anh duy nhất).'
      )
    }

    try {
      const existing =
        await WordChainRedisService.checkExistingEnWords(validWords)
      const toAdd = validWords.filter((w) => !existing.includes(w))

      if (toAdd.length > 0) {
        await WordChainRepository.addEnWords(toAdd)
        await WordChainService.initEnDictionary(true)
      }

      const title =
        toAdd.length > 0
          ? 'Đã thêm thành công các từ mới.'
          : 'Không có từ mới nào được thêm.'
      let description = ''

      if (toAdd.length > 0) {
        description += `- Đã thêm: ${toAdd.map((w) => `\`${w}\``).join(', ')}.`
      }

      if (existing.length > 0) {
        if (description) description += '\n'
        description += `- Trùng lặp: ${existing.map((w) => `\`${w}\``).join(', ')}.`
      }

      if (invalidLines.length > 0) {
        if (description) description += '\n'
        description += `- Không hợp lệ: ${invalidLines.map((l) => `\`${l}\``).join(', ')}.`
      }

      await InteractionUtil.replySuccess(interaction, title, description)
    } catch (error) {
      if (error instanceof NormalError) throw error
      this.container.logger.error(
        '[WordChainAdd] Failed to add English words:',
        error
      )
      throw new NormalError('Đã xảy ra lỗi khi thêm từ vào hệ thống.')
    }
  }
}
