import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  WebhookClient,
  roleMention
} from 'discord.js'

interface WebhookNotificationPayload {
  webhookClient: WebhookClient
  title: string
  sourceUrl: string
  username: string
  avatarURL?: string
  roleId?: string | null
  files?: AttachmentBuilder[]
  linkLabel: string
  splitFilesIntoFollowUps?: boolean
}

export class WebhookNotificationService {
  private static readonly MAX_FILES_PER_MESSAGE = 10

  private static chunk<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    )
  }

  public static async send(payload: WebhookNotificationPayload) {
    const sourceUrl = payload.sourceUrl.trim()
    const title = payload.title.trim()
    const rolePing = payload.roleId ? `${roleMention(payload.roleId)}\n` : ''

    // Keep Twitter layout as canonical style for all notification sources.
    const content = title ? `**${title}**\n${rolePing}`.trim() : rolePing.trim()

    const linkButton = new ButtonBuilder()
      .setLabel(payload.linkLabel)
      .setStyle(ButtonStyle.Link)
      .setURL(sourceUrl)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton)
    const allFiles = payload.files || []
    const filesChunks = payload.splitFilesIntoFollowUps
      ? this.chunk(allFiles, this.MAX_FILES_PER_MESSAGE)
      : [allFiles]
    const firstChunk = filesChunks[0] || []

    let lastMessage = await payload.webhookClient.send({
      content: content || undefined,
      username: payload.username,
      avatarURL: payload.avatarURL,
      files: firstChunk.length > 0 ? firstChunk : undefined,
      components: [row],
      withComponents: true
    })

    if (payload.splitFilesIntoFollowUps && filesChunks.length > 1) {
      for (let i = 1; i < filesChunks.length; i++) {
        const chunk = filesChunks[i]!
        if ('reply' in lastMessage && typeof lastMessage.reply === 'function') {
          lastMessage = await lastMessage.reply({
            files: chunk
          })
          continue
        }

        lastMessage = await payload.webhookClient.send({
          username: payload.username,
          avatarURL: payload.avatarURL,
          files: chunk
        })
      }
    }
  }
}
