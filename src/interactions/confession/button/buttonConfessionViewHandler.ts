import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ContainerBuilder, MediaGalleryBuilder, MessageFlags } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

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
    if (!interaction.customId.startsWith(CUSTOM_ID.BTN_CONFESSION_VIEW_PREFIX)) return this.none()
    const code = interaction.customId.split(':')[1]
    return this.some({ code })
  }

  public async run(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const code = interaction.customId.split(':')[1]
    const confession = await ConfessionRepository.getConfessionByCode(code)

    if (!confession) {
      throw new NormalError('Hệ thống không tìm thấy confession này.')
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
    // @ts-expect-error - attachmentUrls is not in the generated type but exists in DB
    if (confession.attachmentUrls.length > 0) {
      const gallery = new MediaGalleryBuilder()

      // @ts-expect-error - attachmentUrls is not in the generated type but exists in DB
      for (const url of confession.attachmentUrls) {
        gallery.addItems((item) => item.setURL(url))
      }

      container.addMediaGalleryComponents(gallery)
    }

    await interaction.editReply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    })
  }
}
