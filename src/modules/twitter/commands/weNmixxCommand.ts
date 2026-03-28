import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

const MEMBERS = [
  'Haewon',
  'Lily',
  'Sullyoon',
  'Bae',
  'Jiwoo',
  'Kyujin'
] as const

@RegisterChatInputCommand((builder) =>
  builder
    .setName('we-nmixx')
    .setDescription('Đăng bài từ X/Twitter với webhook của thành viên')
)
@ApplyOptions<Command.Options>({
  name: 'we-nmixx',
  description: 'Đăng bài từ X/Twitter với webhook của thành viên',
  preconditions: ['GuildOnly']
})
export class WeNmixxCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_WE_NMIXX)
      .setTitle('Đăng bài WE_NMIXX')

    const urlInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_WE_NMIXX_URL)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://x.com/WE_NMIXX/status/...')
      .setRequired(true)
      
    const urlLabel = new LabelBuilder()
      .setLabel('Đường dẫn X/Twitter')
      .setTextInputComponent(urlInput)

    const memberSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_WE_NMIXX_MEMBER)
      .setPlaceholder('Chọn thành viên NMIXX')
      .setRequired(true)
      .addOptions(
        ...MEMBERS.map((m) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(m)
            .setValue(m)
            .setDescription(`Webhook của ${m}`)
        )
      )
      
    const memberLabel = new LabelBuilder()
      .setLabel('Thành viên NMIXX')
      .setStringSelectMenuComponent(memberSelect)

    const descInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_WE_NMIXX_DESC)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập nội dung đã dịch để thay thế bài gốc (không bắt buộc)')
      .setRequired(false)
      
    const descLabel = new LabelBuilder()
      .setLabel('Mô tả dịch (Tuỳ chọn)')
      .setTextInputComponent(descInput)

    modal.addLabelComponents(urlLabel, memberLabel, descLabel)

    await interaction.showModal(modal)
  }
}
