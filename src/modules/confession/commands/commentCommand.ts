import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  LabelBuilder,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

@ApplyOptions<Command.Options>({
  name: 'Comment',
  description: 'Gửi bình luận ẩn danh vào kênh hoặc trả lời tin nhắn.',
  requiredUserPermissions: ['Administrator'],
  preconditions: ['ConfessionChannelOnly']
})
export class CommentCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerContextMenuCommand((builder) =>
      builder
        .setName('Bình luận ẩn danh')
        .setType(ApplicationCommandType.Message)
    )

    registry.registerChatInputCommand((builder) =>
      builder
        .setName('comment')
        .setDescription('Gửi bình luận ẩn danh vào kênh hiện tại.')
    )
  }

  @RequiresGuildContext()
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.showCommentModal(interaction)
  }

  @RequiresGuildContext()
  public override async contextMenuRun(
    interaction: MessageContextMenuCommandInteraction
  ) {
    return this.showCommentModal(interaction, interaction.targetMessage)
  }

  private async showCommentModal(
    interaction:
      | ChatInputCommandInteraction
      | MessageContextMenuCommandInteraction,
    targetMessage?: MessageContextMenuCommandInteraction['targetMessage']
  ) {
    const isBot = targetMessage?.author.bot ?? false
    const authorName = targetMessage?.author.displayName

    const commentInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_CONTENT)
      .setPlaceholder(
        isBot ? 'Nhập nội dung bình luận...' : 'Nhập nội dung trả lời...'
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000)

    const commentLabel = new LabelBuilder()
      .setLabel('Nội dung bình luận')
      .setTextInputComponent(commentInput)
      .setDescription('Nội dung bình luận này sẽ được gửi/trả lời ẩn danh.')

    const modalTitle =
      !targetMessage || isBot
        ? 'Bình luận'
        : `Trả lời bình luận của ${authorName}`.slice(0, 45)

    const modal = new ModalBuilder()
      .setCustomId(
        targetMessage
          ? `${CUSTOM_ID.MODAL_COMMENT_PREFIX}${targetMessage.id}`
          : CUSTOM_ID.MODAL_COMMENT_PREFIX
      )
      .setTitle(modalTitle)
      .addLabelComponents(commentLabel)

    await interaction.showModal(modal)
  }
}
