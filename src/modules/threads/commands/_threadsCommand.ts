import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags
} from 'discord.js'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'

import { ThreadsService } from '~/modules/threads/services/threadsService'

export class ThreadsCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const url = interaction.options.getString('url', true)
    const showCaption = interaction.options.getBoolean('caption') ?? false
    const spoiler = interaction.options.getBoolean('spoiler') ?? false

    const threadsData = await ThreadsService.fetchThreadsData(url)

    const container = new ContainerBuilder()
      .setAccentColor(0x000000) // Threads Black
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `${STATIC_EMOJI.THREADS || '🧵'} **[@${threadsData.username}](https://www.threads.net/@${threadsData.username})**`
        )
      )

    if (showCaption && threadsData.caption) {
      container
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`>>> ${threadsData.caption}`)
        )
    }

    if (threadsData.media.length > 0) {
      container
        .addSeparatorComponents((separator) => separator)
        .addMediaGalleryComponents((gallery) => {
          threadsData.media.forEach((media) => {
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
            .setLabel('Xem trên Threads')
            .setStyle(ButtonStyle.Link)
            .setURL(threadsData.url)
        )
      )

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    })
  }
}
