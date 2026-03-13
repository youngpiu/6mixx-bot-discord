import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { type WordChainMode } from '~/modules/word-chain/services/WordChainRedisService'

export class WordChainAddCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const mode = await this.detectMode(
      interaction.guild!.id,
      interaction.channelId
    )

    // Encode mode into customId so the modal handler knows which dictionary to add to
    const modalCustomId =
      mode === 'en'
        ? CUSTOM_ID.MODAL_WORDCHAIN_ADD_EN
        : CUSTOM_ID.MODAL_WORDCHAIN_ADD_VI

    const modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle('Thêm từ nối mới')

    const phrasesInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_WORDCHAIN_PHRASES)
      .setPlaceholder(
        mode === 'en'
          ? 'apple\nbanana\ncherry'
          : 'hoa hồng\nhồng nhung\nnhung hươu'
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)

    const phrasesLabel = new LabelBuilder()
      .setLabel('Nhập danh sách từ')
      .setDescription(
        mode === 'en'
          ? 'Mỗi dòng là một từ.'
          : 'Mỗi từ 1 dòng, mỗi dòng gồm đúng 2 từ.'
      )
      .setTextInputComponent(phrasesInput)

    modal.addLabelComponents(phrasesLabel)

    await interaction.showModal(modal)
  }

  private static async detectMode(
    guildId: string,
    channelId: string
  ): Promise<WordChainMode> {
    const setting = await SettingRepository.find(guildId)
    if (setting && channelId === setting.englishWordChainChannelId) return 'en'
    return 'vi'
  }
}
