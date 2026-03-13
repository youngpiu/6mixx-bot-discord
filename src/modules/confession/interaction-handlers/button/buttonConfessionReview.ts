import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import { ButtonInteraction, ChannelType, ForumChannel } from 'discord.js'
import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { ConfessionStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { CounterRepository } from '~/shared/repositories/counterRepository'
import { InteractionUtil, MessageUtil } from '~/shared/utils/messageUtil'

import { ConfessionHelper } from '~/modules/confession/helpers/ConfessionHelper'
import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'
import { GuildRepository } from '~/modules/confession/repositories/guildRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonConfessionReview extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (
      interaction.customId.startsWith(CUSTOM_ID.BTN_CONFESSION_APPROVE_PREFIX)
    ) {
      const confessionId = interaction.customId.slice(
        CUSTOM_ID.BTN_CONFESSION_APPROVE_PREFIX.length
      )
      return this.some({ confessionId, action: 'APPROVE' })
    }

    if (
      interaction.customId.startsWith(CUSTOM_ID.BTN_CONFESSION_REJECT_PREFIX)
    ) {
      const confessionId = interaction.customId.slice(
        CUSTOM_ID.BTN_CONFESSION_REJECT_PREFIX.length
      )
      return this.some({ confessionId, action: 'REJECT' })
    }

    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { confessionId, action } = result

    if (action === 'APPROVE') {
      await interaction.deferUpdate()
    }

    const confession = await ConfessionRepository.findById(confessionId)

    if (!confession) {
      throw new NormalError('Không tìm thấy confession này.')
    }

    if (confession.status !== ConfessionStatus.PENDING) {
      throw new NormalError('Confession này đã được xét duyệt rồi.')
    }

    if (action === 'REJECT') {
      const modal = new ModalBuilder()
        .setCustomId(
          `${CUSTOM_ID.MODAL_CONFESSION_REJECT_PREFIX}${confessionId}`
        )
        .setTitle(`Từ chối Confession #${confession.code}`)

      const reasonInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT_CONTENT) // Tái sử dụng CUSTOM_ID cho input
        .setPlaceholder('Nhập lý do từ chối...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000)

      const reasonLabel = new LabelBuilder()
        .setLabel('Lý do từ chối')
        .setTextInputComponent(reasonInput)

      modal.addLabelComponents(reasonLabel)

      await interaction.showModal(modal)
      return
    }

    // Approve Logic Below

    const guildConfig = await GuildRepository.getConfig(interaction.guild!.id)
    if (!guildConfig || !guildConfig.forumChannelId) {
      throw new NormalError('Kênh đăng confession chưa được thiết lập.')
    }

    const forumChannel = (await container.client.channels.fetch(
      guildConfig.forumChannelId
    )) as ForumChannel

    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
      throw new NormalError(
        'Kênh đăng confession không tồn tại hoặc không hợp lệ.'
      )
    }

    // Prepare Thread Content

    const authorLine = confession.isAnonymous
      ? 'Ẩn danh'
      : `<@${confession.author.userId}>`

    const MAX_TOTAL = 3800
    const MAX_CHUNK = 1900

    // Trim total content to max total allowed
    const rawContent =
      confession.content.length > MAX_TOTAL
        ? confession.content.substring(0, MAX_TOTAL)
        : confession.content

    // Split content into chunks at natural boundaries (\n or .)
    const chunks: string[] = []
    let remaining = rawContent

    while (remaining.length > 0) {
      if (remaining.length <= MAX_CHUNK) {
        chunks.push(remaining)
        break
      }

      // Try to cut at \n or . within the allowed range
      let cutIndex = -1
      const newlineIndex = remaining.lastIndexOf('\n', MAX_CHUNK)
      const periodIndex = remaining.lastIndexOf('.', MAX_CHUNK)

      if (newlineIndex > MAX_CHUNK * 0.5) cutIndex = newlineIndex + 1
      else if (periodIndex > MAX_CHUNK * 0.5) cutIndex = periodIndex + 1
      else cutIndex = MAX_CHUNK // Hard cut if no natural boundary found

      chunks.push(remaining.substring(0, cutIndex).trimEnd())
      remaining = remaining.substring(cutIndex).trimStart()
    }

    const approvedSequence = await CounterRepository.getNextSequence(
      interaction.guild!.id,
      'CONFESSION_APPROVED'
    )

    const creditText = `\n\n\\- _Gửi bởi: **${authorLine}** - <t:${Math.floor(confession.createdAt.getTime() / 1000)}:F>_`

    // Append credit to the last chunk
    chunks[chunks.length - 1] += creditText

    // Create a new thread in the Forum channel
    const thread = await forumChannel.threads.create({
      name: `Confession #${approvedSequence}`,
      message: {
        content: chunks[0]
      }
    })

    // Send remaining chunks as follow-up messages
    for (let i = 1; i < chunks.length; i++) {
      await MessageUtil.sendToChannel(thread, { content: chunks[i] })
    }

    // Update Confession Status in Db
    await ConfessionRepository.update(confession.id, {
      status: ConfessionStatus.APPROVED,
      forumPostId: thread.id,
      approvedBy: interaction.user.id
    })

    await ConfessionHelper.sendConfessionLog({
      guildId: interaction.guild!.id,
      confession: {
        code: confession.code,
        content: confession.content,
        isAnonymous: confession.isAnonymous,
        authorId: confession.authorId,
        createdAt: confession.createdAt
      },
      event: 'APPROVED',
      executorId: interaction.user.id
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Đã duyệt confession \`#${confession.code}\`, bài đăng tại <#${thread.id}>.`
    )
  }
}
