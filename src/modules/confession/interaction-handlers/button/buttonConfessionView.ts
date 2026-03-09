// Handler to view confession details
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  MediaGalleryBuilder,
  MessageFlags
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { DetailBuilder } from '~/shared/components/DetailBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonConfessionView extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.BTN_CONFESSION_VIEW_PREFIX))
      return this.none()
    const code = interaction.customId.split(':')[1]
    return this.some({ code })
  }

  public async run(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const code = interaction.customId.split(':')[1]
    const confession = await ConfessionRepository.findByCode(code)

    if (!confession) {
      throw new NormalError('Hệ thống không tìm thấy confession này.')
    }

    // Build container with V2 components
    const builder = new DetailBuilder({
      title: `Chi tiết Confession #${confession.code}`
    })
      .addContent(confession.content)
      .addContent(
        `-# **Loại:** ${confession.isAnonymous ? 'Ẩn danh' : 'Công khai'} • **Trạng thái:** ${confession.status} • **Thời gian:** <t:${Math.floor(confession.createdAt.getTime() / 1000)}:R>${!confession.isAnonymous ? ` • **Người gửi:** <@${confession.authorId}>` : ''}`
      )

    const [container] = builder.build()

    if (confession.attachmentUrls.length > 0) {
      const gallery = new MediaGalleryBuilder()

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
