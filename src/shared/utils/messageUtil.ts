import {
  Channel,
  ContainerBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  type Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  RepliableInteraction,
  SendableChannels
} from 'discord.js'

import type { ErrorType } from '~/core/errorResponse'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'
import { TIME } from '~/shared/constants/timeConstant'

export type { RepliableInteraction } from 'discord.js'
export type OptionalRepliableInteraction =
  | RepliableInteraction
  | null
  | undefined

type MessageInput = Message | null | undefined
type ChannelInput = SendableChannels | null | undefined

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getEmojiForErrorType(type: ErrorType): string {
  switch (type) {
    case 'DATABASE':
      return STATIC_EMOJI.DATABASE_ERROR
    case 'SYSTEM':
      return STATIC_EMOJI.SYSTEM_ERROR
    case 'RATE_LIMIT':
      return STATIC_EMOJI.RATE_LIMIT_ERROR
    case 'PERMISSION':
      return STATIC_EMOJI.PERMISSION_ERROR
    case 'BANNED':
      return STATIC_EMOJI.BANNED_ERROR
    default:
      return STATIC_EMOJI.ERROR
  }
}

// ─── MessageUtil ──────────────────────────────────────────────────────────────

export class MessageUtil {
  private static delay(ms: number): Promise<void> {
    return new Promise<void>((res) => setTimeout(res, ms))
  }

  private static scheduleDelete(messages: Message[], timeout?: number): void {
    if (!timeout || timeout <= 0) return
    this.deleteAfter(messages, timeout)
  }

  static async sendToChannel(
    channel: Channel | null | undefined,
    messageOptions: MessageCreateOptions,
    timeoutDeleteMessage?: number
  ): Promise<Message | null> {
    if (!channel?.isTextBased() || !channel.isSendable()) return null

    try {
      const sentMessage = await channel.send(messageOptions)
      this.scheduleDelete([sentMessage], timeoutDeleteMessage)
      return sentMessage
    } catch {
      return null
    }
  }

  static async reply(
    message: MessageInput,
    messageOptions: MessageCreateOptions,
    timeoutDeleteMessage?: number
  ): Promise<Message | null> {
    if (
      !message ||
      !message.channel.isTextBased() ||
      !message.channel.isSendable()
    )
      return null

    try {
      const repliedMessage = await message.reply(messageOptions)
      this.scheduleDelete([repliedMessage, message], timeoutDeleteMessage)
      return repliedMessage
    } catch {
      return null
    }
  }

  static async edit(
    message: MessageInput,
    messageOptions: MessageEditOptions,
    timeoutDeleteMessage?: number
  ): Promise<Message | null> {
    if (!message || !message.editable) return null

    try {
      const editedMessage = await message.edit(messageOptions)
      this.scheduleDelete([editedMessage], timeoutDeleteMessage)
      return editedMessage
    } catch {
      return null
    }
  }

  static async sendTyping(message: MessageInput): Promise<void> {
    if (!message || !message.channel) return
    if (message.channel.isTextBased() && message.channel.isSendable()) {
      await message.channel.sendTyping().catch(() => null)
    }
    return
  }

  static async deleteNow(
    messages: MessageInput | MessageInput[]
  ): Promise<boolean> {
    const msgArray = Array.isArray(messages) ? messages : [messages]
    const valid = msgArray.filter((m): m is Message => m != null && m.deletable)
    if (valid.length === 0) return false

    const results = await Promise.allSettled(valid.map((m) => m.delete()))
    return results.some((r) => r.status === 'fulfilled')
  }

  static async deleteAfter(
    messages: MessageInput | MessageInput[],
    timeoutDeleteMessage: number
  ): Promise<boolean> {
    const msgArray = Array.isArray(messages) ? messages : [messages]
    const valid = msgArray.filter((m): m is Message => m != null && m.deletable)
    if (valid.length === 0) return false

    await this.delay(timeoutDeleteMessage)
    return this.deleteNow(valid)
  }

  static async replyWithContainer(
    message: Message,
    containerOrText: ContainerBuilder | string,
    timeoutDeleteMessage?: number
  ): Promise<Message | null> {
    const container =
      typeof containerOrText === 'string'
        ? new ContainerBuilder().addTextDisplayComponents((t) =>
            t.setContent(containerOrText)
          )
        : containerOrText

    return this.reply(
      message,
      {
        components: [container],
        flags: ['IsComponentsV2', 'SuppressNotifications']
      },
      timeoutDeleteMessage
    )
  }

  static async replySuccess(
    message: Message,
    content: string,
    timeoutDeleteMessage: number = TIME.S15
  ): Promise<Message | null> {
    return MessageUtil.replyWithContainer(
      message,
      new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`${STATIC_EMOJI.SUCCESS} ${content}`)
      ),
      timeoutDeleteMessage
    )
  }

  static async replyError(
    message: Message,
    content: string,
    timeoutDeleteMessage: number = TIME.S15,
    type: ErrorType = 'NORMAL'
  ): Promise<Message | null> {
    const errorEmoji = getEmojiForErrorType(type)
    return MessageUtil.replyWithContainer(
      message,
      new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`${errorEmoji} ${content}`)
      ),
      timeoutDeleteMessage
    )
  }

  static async sendWithContainer(
    channel: ChannelInput,
    containerOrText: ContainerBuilder | string,
    timeoutDeleteMessage?: number
  ): Promise<Message | null> {
    if (!channel) return null

    const container =
      typeof containerOrText === 'string'
        ? new ContainerBuilder().addTextDisplayComponents((t) =>
            t.setContent(containerOrText)
          )
        : containerOrText

    return MessageUtil.sendToChannel(
      channel,
      {
        components: [container],
        flags: ['IsComponentsV2', 'SuppressNotifications']
      },
      timeoutDeleteMessage
    )
  }
}

// ─── InteractionUtil ──────────────────────────────────────────────────────────

export class InteractionUtil {
  static async reply(
    interaction: RepliableInteraction,
    options: InteractionReplyOptions
  ): Promise<InteractionResponse | null> {
    if (!interaction || interaction.replied || interaction.deferred) return null

    try {
      const response = await interaction.reply({
        flags: ['Ephemeral'],
        ...options
      })
      return response
    } catch {
      return null
    }
  }

  static async editReply(
    interaction: OptionalRepliableInteraction,
    options: InteractionEditReplyOptions
  ): Promise<Message | null> {
    if (!interaction || (!interaction.replied && !interaction.deferred))
      return null

    try {
      return await interaction.editReply(options)
    } catch {
      return null
    }
  }

  static async followUp(
    interaction: OptionalRepliableInteraction,
    options: InteractionReplyOptions
  ): Promise<Message | null> {
    if (!interaction || (!interaction.replied && !interaction.deferred))
      return null

    try {
      const followed = await interaction.followUp({
        flags: 'Ephemeral',
        ...options
      })
      return followed
    } catch {
      return null
    }
  }

  static async replyError(
    interaction: OptionalRepliableInteraction,
    content: string,
    type: ErrorType = 'NORMAL'
  ): Promise<Message | InteractionResponse | null> {
    const errorEmoji = getEmojiForErrorType(type)
    return this.replyWithContainer(interaction, `${errorEmoji} ${content}`)
  }

  static async replySuccess(
    interaction: OptionalRepliableInteraction,
    content: string,
    description?: string,
    ephemeral?: boolean
  ): Promise<Message | InteractionResponse | null> {
    const successContainerr = new ContainerBuilder().addTextDisplayComponents(
      (t) => t.setContent(`${STATIC_EMOJI.SUCCESS} ${content}`)
    )

    if (description)
      successContainerr
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) => t.setContent(description))

    return this.replyWithContainer(interaction, successContainerr, ephemeral)
  }

  static async replyWithContainer(
    interaction: OptionalRepliableInteraction,
    containerOrText: ContainerBuilder | string,
    ephemeral: boolean = true
  ): Promise<Message | InteractionResponse | null> {
    if (!interaction) return null

    const container =
      typeof containerOrText === 'string'
        ? new ContainerBuilder().addTextDisplayComponents((t) =>
            t.setContent(containerOrText)
          )
        : containerOrText

    if (interaction.deferred || interaction.replied) {
      return this.editReply(interaction, {
        components: [container],
        flags: ['IsComponentsV2']
      })
    }

    return this.reply(interaction, {
      components: [container],
      flags: ephemeral ? ['IsComponentsV2', 'Ephemeral'] : ['IsComponentsV2']
    })
  }
}

export const createTextContainer = (content: string) =>
  new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(content))
