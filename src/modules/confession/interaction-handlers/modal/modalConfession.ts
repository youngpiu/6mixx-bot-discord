// Handler for confession modal submission
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalSubmitInteraction,
  TextChannel
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'
import { GuildRepository } from '~/modules/confession/repositories/guildRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalConfession extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.MODAL_CONFESSION_ANONYMOUS &&
      interaction.customId !== CUSTOM_ID.MODAL_CONFESSION_NAMED
    ) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) {
      throw new NormalError('Không thể tìm thấy máy chủ.')
    }

    const isAnonymous =
      interaction.customId === CUSTOM_ID.MODAL_CONFESSION_ANONYMOUS

    // Extract data using V2 API
    const content = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_CONTENT
    )
    const uploadedFiles = interaction.fields.getUploadedFiles('attachment')

    // Filter only image files (Collection methods)
    const imageFiles = uploadedFiles?.filter((file) =>
      file.contentType?.startsWith('image/')
    )
    const nonImageFiles = uploadedFiles?.filter(
      (file) => !file.contentType?.startsWith('image/')
    )

    // Check if non-image files were uploaded
    if (nonImageFiles && nonImageFiles.size > 0) {
      const nonImageNames = nonImageFiles.map((f) => f.name).join(', ')
      throw new NormalError(
        `Chỉ cho phép upload ảnh. Các file sau bị từ chối: ${nonImageNames}`
      )
    }

    const attachmentUrls = imageFiles?.map((file) => file.url) ?? []

    const confession = await ConfessionRepository.create({
      guildId: interaction.guild.id,
      authorId: interaction.user.id,
      content,
      isAnonymous,
      attachmentUrls
    })

    const existingConfig = await GuildRepository.getConfig(interaction.guild.id)

    if (existingConfig?.notificationForumChannelId) {
      const notificationChannel = (await container.client.channels.fetch(
        existingConfig.notificationForumChannelId
      )) as TextChannel

      if (notificationChannel) {
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

        const viewButton = new ButtonBuilder()
          .setCustomId(
            `${CUSTOM_ID.BTN_CONFESSION_VIEW_PREFIX}${confession.code}`
          )
          .setLabel('Xem chi tiết')
          .setStyle(ButtonStyle.Primary)

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          viewButton
        )

        await notificationChannel.send({
          embeds: [notificationEmbed],
          components: [row]
        })
      }
    }

    await InteractionUtil.replySuccess(
      interaction,
      lines(
        `Confession **#${confession.code}** đã được gửi.`,
        'Nội dung đang chờ được duyệt bởi Ban quản lý.'
      )
    )
  }
}
