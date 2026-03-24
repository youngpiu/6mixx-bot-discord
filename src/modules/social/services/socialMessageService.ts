import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags
} from 'discord.js'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'

import { SocialPost } from '~/modules/social/types/socialTypes'

export class SocialMessageService {
  private static getPlatformEmoji(platform: SocialPost['platform']): string {
    switch (platform) {
      case 'instagram':
        return STATIC_EMOJI.INSTAGRAM
      case 'tiktok':
        return STATIC_EMOJI.TIKTOK
      case 'twitter':
        return STATIC_EMOJI.TWITTER
      case 'threads':
        return STATIC_EMOJI.THREADS
      default:
        return ''
    }
  }

  private static getPlatformLabel(platform: SocialPost['platform']): string {
    switch (platform) {
      case 'instagram':
        return 'Instagram'
      case 'tiktok':
        return 'TikTok'
      case 'twitter':
        return 'X'
      case 'threads':
        return 'Threads'
      default:
        return 'Social Media'
    }
  }

  private static chunk<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    )
  }

  public static async sendSocialPost(
    interaction: ChatInputCommandInteraction,
    post: SocialPost,
    options: {
      spoiler?: boolean
      showCaption?: boolean
      showStats?: boolean
    } = {}
  ) {
    const { spoiler = false, showCaption = true, showStats = true } = options
    const mediaChunks = this.chunk(post.media, 5)

    const buildFirstContainer = () => {
      const emoji = this.getPlatformEmoji(post.platform)
      const timestampText = post.timestamp
        ? ` <t:${Math.floor(post.timestamp)}:s>`
        : ''

      const container = new ContainerBuilder().addTextDisplayComponents(
        (textDisplay) =>
          textDisplay.setContent(
            `${emoji} **[@${post.username}](${post.authorUrl})**${timestampText}`
          )
      )

      if (showStats && post.stats && post.stats.length > 0) {
        const statsText = post.stats
          .map((stat) => `-# **${stat.label}:** ${stat.value.toLocaleString()}`)
          .join('\n')

        container
          .addSeparatorComponents((separator) => separator)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(statsText)
          )
      }

      const shouldDisplayCaption = showCaption || post.media.length === 0
      if (shouldDisplayCaption && post.caption) {
        container
          .addSeparatorComponents((separator) => separator)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`>>> ${post.caption}`)
          )
      }

      if (mediaChunks.length > 0) {
        container
          .addSeparatorComponents((separator) => separator)
          .addMediaGalleryComponents((gallery) => {
            mediaChunks[0]!.forEach((media) => {
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
              .setLabel(`Xem trên ${this.getPlatformLabel(post.platform)}`)
              .setStyle(ButtonStyle.Link)
              .setURL(post.postUrl)
          )
        )

      return container
    }

    let lastMessage = await interaction.editReply({
      components: [buildFirstContainer()],
      flags: MessageFlags.IsComponentsV2
    })

    if (mediaChunks.length > 1) {
      for (let i = 1; i < mediaChunks.length; i++) {
        const chunkContent = mediaChunks[i]!
        const followUpContainer =
          new ContainerBuilder().addMediaGalleryComponents((gallery) => {
            chunkContent.forEach((media) => {
              gallery.addItems((mediaItem) =>
                mediaItem.setURL(media.url).setSpoiler(spoiler)
              )
            })
            return gallery
          })

        lastMessage = await lastMessage.reply({
          components: [followUpContainer],
          flags: MessageFlags.IsComponentsV2
        })
      }
    }
  }
}
