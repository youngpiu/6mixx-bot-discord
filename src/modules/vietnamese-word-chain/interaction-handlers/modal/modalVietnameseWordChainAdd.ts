import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { VietnameseWordChainRepository } from '~/modules/vietnamese-word-chain/repositories/VietnameseWordChainRepository'
import { VietnameseWordChainService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainService'
import { VietnameseWordChainRedisService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainRedisService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalVietnameseWordChainAdd extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_VIETNAMESE_WORDCHAIN_ADD) {
      return this.none()
    }

    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const input = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_VIETNAMESE_WORDCHAIN_PHRASES)
    const lines = input.split('\n').map((l) => l.trim().toLowerCase()).filter((l) => l.length > 0)

    if (lines.length === 0) {
      return InteractionUtil.replyError(interaction, 'Vui lòng nhập ít nhất một từ.')
    }

    // Basic validation: each line must be 2 words
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
      return InteractionUtil.replyError(
        interaction,
        'Không có từ nào hợp lệ (phải gồm đúng 2 từ cách nhau bởi khoảng trắng).'
      )
    }

    try {
      // 1. Identify existing and new phrases
      const existing = await VietnameseWordChainRedisService.checkExistingPhrases(validPhrases)
      const toAdd = validPhrases.filter((p) => !existing.includes(p))

      if (toAdd.length > 0) {
        // 2. Save only new ones to DB
        await VietnameseWordChainRepository.addPhrases(toAdd)
        // 3. Reload everything (as agreed for simplicity)
        await VietnameseWordChainService.initDictionary(true)
      }

      const title = toAdd.length > 0 ? 'Đã thêm thành công các từ mới.' : 'Không có từ mới nào được thêm.'
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
      this.container.logger.error('[VietnameseWordChainAdd] Failed to add phrases:', error)
      await InteractionUtil.replyError(interaction, 'Đã xảy ra lỗi khi thêm từ vào hệ thống.')
    }
  }
}
