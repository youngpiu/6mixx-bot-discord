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
}

export class WebhookNotificationService {
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

    await payload.webhookClient.send({
      content: content || undefined,
      username: payload.username,
      avatarURL: payload.avatarURL,
      files:
        payload.files && payload.files.length > 0 ? payload.files : undefined,
      components: [row],
      withComponents: true
    })
  }
}
