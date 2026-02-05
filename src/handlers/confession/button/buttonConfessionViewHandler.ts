import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ContainerBuilder, MediaGalleryBuilder, MessageFlags } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { lines } from '~/utils/textUtil'

import { ConfessionRepository } from '~/repositories/confessionRepository'

export class ButtonConfessionViewHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-confession-view:')) return this.none()
    const code = interaction.customId.split(':')[1]
    return this.some({ code })
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    const code = interaction.customId.split(':')[1]
    const confession = await ConfessionRepository.getConfessionByCode(code)

    if (!confession) {
      await interaction.reply({
        content: 'Không tìm thấy confession.',
        flags: ['Ephemeral']
      })
      return
    }

    // Build container with V2 components
    const container = new ContainerBuilder()
      .setAccentColor(confession.isAnonymous ? 0x57f287 : 0xed4245)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `## Chi tiết Confession #${confession.code}`,
            '',
            confession.content,
            '',
            `-# **Loại:** ${confession.isAnonymous ? 'Ẩn danh' : 'Công khai'} • **Trạng thái:** ${confession.status} • **Thời gian:** <t:${Math.floor(confession.createdAt.getTime() / 1000)}:R>${!confession.isAnonymous ? ` • **Người gửi:** <@${confession.authorId}>` : ''}`
          )
        )
      )

    // Add Media Gallery if there are attachments
    if (confession.attachmentUrls.length > 0) {
      const gallery = new MediaGalleryBuilder()

      for (const url of confession.attachmentUrls) {
        gallery.addItems((item) => item.setURL(url))
      }

      container.addMediaGalleryComponents(gallery)
    }

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    })
  })
}
