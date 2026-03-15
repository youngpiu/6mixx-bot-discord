import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'

import { InstagramService } from '~/modules/instagram/services/instagramService'

export class InstagramCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const url = interaction.options.getString('url', true)
    const showCaption = interaction.options.getBoolean('caption') ?? false

    const spoiler = interaction.options.getBoolean('spoiler') ?? false

    const shortcode = InstagramService.extractShortcode(url)
    if (!shortcode) {
      throw new NormalError('Đường link Instagram không hợp lệ.')
    }

    const igData = await InstagramService.fetchInstagramData(shortcode)

    const container = new ContainerBuilder().addTextDisplayComponents(
      (textDisplay) =>
        textDisplay.setContent(
          `${STATIC_EMOJI.INSTAGRAM} **[@${igData.username}](https://www.instagram.com/${igData.username})**`
        )
    )

    if (showCaption && igData.caption) {
      container
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`>>> ${igData.caption}`)
        )
    }

    if (igData.media.length > 0) {
      container
        .addSeparatorComponents((separator) => separator)
        .addMediaGalleryComponents((gallery) => {
          igData.media.forEach((media) => {
            gallery.addItems((mediaItem) =>
              mediaItem.setURL(media.url).setSpoiler(spoiler)
            )
          })
          return gallery
        })
    }

    container
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setLabel('Xem trên Instagram')
            .setStyle(ButtonStyle.Link)
            .setURL(igData.url)
        )
      )

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    })
  }
}
