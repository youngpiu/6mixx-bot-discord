import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalSubmitInteraction,
  TextChannel
} from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { ConfessionRepository } from '~/repositories/confessionRepository'

export class ModalConfessionHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId !== 'modal-confession-anonymous' &&
      interaction.customId !== 'modal-confession-named'
    ) {
      return this.none()
    }
    return this.some()
  }

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      await interaction.editReply({ content: 'Lỗi: Không tìm thấy máy chủ.' })
      return
    }

    const isAnonymous = interaction.customId === 'modal-confession-anonymous'

    // Extract data using V2 API
    const content = interaction.fields.getTextInputValue('content')
    const uploadedFiles = interaction.fields.getUploadedFiles('attachment')

    // Filter only image files (Collection methods)
    const imageFiles = uploadedFiles?.filter((file) => file.contentType?.startsWith('image/'))
    const nonImageFiles = uploadedFiles?.filter((file) => !file.contentType?.startsWith('image/'))

    // Check if non-image files were uploaded
    if (nonImageFiles && nonImageFiles.size > 0) {
      const nonImageNames = nonImageFiles.map((f) => f.name).join(', ')
      await interaction.editReply({
        embeds: [
          {
            title: '❌ Chỉ cho phép upload ảnh',
            description: `Các file sau không phải ảnh và bị từ chối: ${nonImageNames}`,
            color: 0xed4245
          }
        ]
      })
      return
    }

    // Get attachment URLs
    const attachmentUrls = imageFiles?.map((file) => file.url) ?? []

    // Ensure member exists (handled by join sync)

    // Save confession to database
    const confession = await ConfessionRepository.createConfession({
      guildId: interaction.guildId,
      authorId: interaction.user.id,
      content,
      isAnonymous,
      attachmentUrls
    })

    // Get config to find notification channel
    const config = await ConfessionRepository.getConfig(interaction.guildId)

    if (config?.notificationChannelId) {
      const notificationChannel = (await container.client.channels.fetch(
        config.notificationChannelId
      )) as TextChannel

      if (notificationChannel) {
        // Create short notification embed
        const notificationEmbed = new EmbedBuilder()
          .setTitle(`Confession mới #${confession.code}`)
          .setDescription(
            lines(
              `**Loại:** ${isAnonymous ? 'Ẩn danh' : 'Công khai'}`,
              `**Nội dung:** ${content.length > 100 ? content.substring(0, 100) + '...' : content}`,
              `**Hình ảnh:** ${attachmentUrls.length > 0 ? `${attachmentUrls.length} file` : 'Không có'}`
            )
          )
          .setColor(isAnonymous ? 0x57f287 : 0xed4245)
          .setTimestamp()

        // Create View Details button
        const viewButton = new ButtonBuilder()
          .setCustomId(`btn-confession-view:${confession.code}`)
          .setLabel('Xem chi tiết')
          .setStyle(ButtonStyle.Primary)

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(viewButton)

        await notificationChannel.send({
          embeds: [notificationEmbed],
          components: [row]
        })
      }
    }

    // Reply to user
    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Gửi Confession thành công',
          description: lines(
            `Confession **#${confession.code}** đã được gửi.`,
            'Nội dung đang chờ được duyệt bởi Ban quản lý.'
          )
        })
      ]
    })

    await deleteReplyInteraction(interaction)
  })
}
