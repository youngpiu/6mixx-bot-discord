// Utility classes for handling Discord messages and interaction replies in a standardized way
import { container } from '@sapphire/pieces'
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

/**
 * Maps an error type to its corresponding emoji.
 *
 * @param type - The type of error.
 * @returns The emoji associated with the error type.
 */
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

/**
 * Utility class for handling message-based operations like sending, replying, editing, and deleting.
 */
export class MessageUtil {
  /**
   * Internal delay function using setTimeout.
   *
   * @param ms - Milliseconds to delay.
   * @returns A promise that resolves after the delay.
   */
  private static delay(ms: number): Promise<void> {
    return new Promise<void>((res) => setTimeout(res, ms))
  }

  /**
   * Schedules a list of messages to be deleted after a specified timeout.
   *
   * @param messages - The messages to delete.
   * @param timeout - The delay in milliseconds before deletion.
   */
  private static scheduleDelete(messages: Message[], timeout?: number): void {
    if (!timeout || timeout <= 0) return
    this.deleteAfter(messages, timeout)
  }

  /**
   * Sends a message to a text-based channel.
   *
   * @param channel - The channel to send the message to.
   * @param messageOptions - Options for the message content.
   * @param timeoutDeleteMessage - Optional timeout in milliseconds to delete the message after sending.
   * @returns The sent message or null if sending failed.
   */
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

  /**
   * Replies to a specific message.
   *
   * @param message - The message to reply to.
   * @param messageOptions - Options for the reply content.
   * @param timeoutDeleteMessage - Optional timeout in milliseconds to delete the reply.
   * @param deleteTrigger - Whether to also delete the trigger message.
   * @returns The replied message or null if replying failed.
   */
  static async reply(
    message: MessageInput,
    messageOptions: MessageCreateOptions,
    timeoutDeleteMessage?: number,
    deleteTrigger: boolean = true
  ): Promise<Message | null> {
    if (
      !message ||
      !message.channel.isTextBased() ||
      !message.channel.isSendable()
    )
      return null

    try {
      const repliedMessage = await message.reply(messageOptions)
      this.scheduleDelete(
        deleteTrigger ? [repliedMessage, message] : [repliedMessage],
        timeoutDeleteMessage
      )
      return repliedMessage
    } catch {
      return null
    }
  }

  /**
   * Edits an existing message.
   *
   * @param message - The message to edit.
   * @param messageOptions - New options for the message content.
   * @param timeoutDeleteMessage - Optional timeout in milliseconds to delete the message after editing.
   * @returns The edited message or null if editing failed.
   */
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

  /**
   * Triggers a 'typing' indicator in the message's channel.
   *
   * @param message - The message whose channel should show the typing indicator.
   */
  static async sendTyping(message: MessageInput): Promise<void> {
    if (!message || !message.channel) return
    if (message.channel.isTextBased() && message.channel.isSendable()) {
      await message.channel.sendTyping().catch(() => null)
    }
    return
  }

  /**
   * Deletes one or more messages immediately.
   *
   * @param messages - The message(s) to delete.
   * @returns True if at least one message was successfully deleted.
   */
  static async deleteNow(
    messages: MessageInput | MessageInput[]
  ): Promise<boolean> {
    const msgArray = Array.isArray(messages) ? messages : [messages]
    const valid = msgArray.filter((m): m is Message => m != null && m.deletable)
    if (valid.length === 0) return false

    const results = await Promise.allSettled(valid.map((m) => m.delete()))
    return results.some((r) => r.status === 'fulfilled')
  }

  /**
   * Deletes one or more messages after a specified delay.
   *
   * @param messages - The message(s) to delete.
   * @param timeoutDeleteMessage - The delay in milliseconds before deletion.
   * @returns A promise that resolves when deletion is attempted.
   */
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

  /**
   * Replies to a message using a ContainerBuilder or a simple text string.
   *
   * @param message - The message to reply to.
   * @param containerOrText - The content to reply with.
   * @param timeoutDeleteMessage - Optional timeout in milliseconds to delete the reply.
   * @param deleteTrigger - Whether to also delete the trigger message.
   * @returns The replied message or null if replying failed.
   */
  static async replyWithContainer(
    message: Message,
    containerOrText: ContainerBuilder | string,
    timeoutDeleteMessage?: number,
    deleteTrigger: boolean = true
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
      timeoutDeleteMessage,
      deleteTrigger
    )
  }

  /**
   * Replies to a message using multiple components.
   *
   * @param message - The message to reply to.
   * @param components - The components to reply with.
   * @param timeoutDeleteMessage - Optional timeout in milliseconds to delete the reply.
   * @param deleteTrigger - Whether to also delete the trigger message.
   * @returns The replied message or null if replying failed.
   */
  static async replyWithComponents(
    message: Message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: any[],
    timeoutDeleteMessage?: number,
    deleteTrigger: boolean = true
  ): Promise<Message | null> {
    return this.reply(
      message,
      {
        components: components,
        flags: ['IsComponentsV2', 'SuppressNotifications']
      },
      timeoutDeleteMessage,
      deleteTrigger
    )
  }

  /**
   * Replies to a message with a success status, prefixed by a success emoji.
   *
   * @param message - The message to reply to.
   * @param content - The success message content.
   * @param timeoutDeleteMessage - How long to wait before deleting the reply.
   * @param deleteTrigger - Whether to also delete the trigger message.
   * @returns The replied message or null.
   */
  static async replySuccess(
    message: Message,
    content: string,
    timeoutDeleteMessage: number = TIME.S15,
    deleteTrigger: boolean = true
  ): Promise<Message | null> {
    return MessageUtil.replyWithContainer(
      message,
      new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`${STATIC_EMOJI.SUCCESS} ${content}`)
      ),
      timeoutDeleteMessage,
      deleteTrigger
    )
  }

  /**
   * Replies to a message with an error status, prefixed by an error emoji.
   *
   * @param message - The message to reply to.
   * @param content - The error message content.
   * @param timeoutDeleteMessage - How long to wait before deleting the reply.
   * @param type - The type of error for emoji selection.
   * @param deleteTrigger - Whether to also delete the trigger message.
   * @returns The replied message or null.
   */
  static async replyError(
    message: Message,
    content: string,
    timeoutDeleteMessage: number = TIME.S15,
    type: ErrorType = 'NORMAL',
    deleteTrigger: boolean = true
  ): Promise<Message | null> {
    const errorEmoji = getEmojiForErrorType(type)
    return MessageUtil.replyWithContainer(
      message,
      new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`${errorEmoji} ${content}`)
      ),
      timeoutDeleteMessage,
      deleteTrigger
    )
  }

  /**
   * Sends a message to a channel using a ContainerBuilder or a simple text string.
   *
   * @param channel - The channel to send to.
   * @param containerOrText - The content to send.
   * @param timeoutDeleteMessage - Optional timeout in milliseconds to delete the message.
   * @returns The sent message or null.
   */
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

  /**
   * Sends a message to a channel using multiple components.
   *
   * @param channel - The channel to send to.
   * @param components - The components to send.
   * @param timeoutDeleteMessage - Optional timeout in milliseconds to delete the message.
   * @returns The sent message or null.
   */
  static async sendWithComponents(
    channel: ChannelInput,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: any[],
    timeoutDeleteMessage?: number
  ): Promise<Message | null> {
    if (!channel) return null

    return MessageUtil.sendToChannel(
      channel,
      {
        components: components,
        flags: ['IsComponentsV2', 'SuppressNotifications']
      },
      timeoutDeleteMessage
    )
  }
}

// ─── InteractionUtil ──────────────────────────────────────────────────────────

/**
 * Utility class for handling interaction-based operations like replies, edits, follow-ups, and DMs.
 */
export class InteractionUtil {
  /**
   * Internal delay function using setTimeout.
   *
   * @param ms - Milliseconds to delay.
   * @returns A promise that resolves after the delay.
   */
  private static delay(ms: number): Promise<void> {
    return new Promise<void>((res) => setTimeout(res, ms))
  }

  /**
   * Schedules an interaction reply to be deleted after a specified timeout.
   *
   * @param interaction - The interaction whose reply should be deleted.
   * @param timeout - The delay in milliseconds before deletion.
   */
  private static scheduleDelete(
    interaction: RepliableInteraction,
    timeout?: number
  ): void {
    if (!timeout || timeout <= 0 || interaction.ephemeral) return
    this.deleteAfter(interaction, timeout)
  }

  /**
   * Deletes an interaction's reply immediately.
   *
   * @param interaction - The interaction whose reply should be deleted.
   * @returns True if the reply was successfully deleted.
   */
  static async deleteNow(interaction: RepliableInteraction): Promise<boolean> {
    if (!interaction || interaction.ephemeral) return false
    try {
      await interaction.deleteReply()
      return true
    } catch {
      return false
    }
  }

  /**
   * Deletes an interaction's reply after a specified delay.
   *
   * @param interaction - The interaction whose reply should be deleted.
   * @param timeout - The delay in milliseconds before deletion.
   * @returns A promise that resolves when deletion is attempted.
   */
  static async deleteAfter(
    interaction: RepliableInteraction,
    timeout: number
  ): Promise<boolean> {
    if (!interaction || interaction.ephemeral) return false
    await this.delay(timeout)
    return this.deleteNow(interaction)
  }

  /**
   * Initial reply to an interaction. Defaults to ephemeral.
   *
   * @param interaction - The interaction to reply to.
   * @param options - Reply options.
   * @returns The interaction response or null.
   */
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

  /**
   * Edits the initial reply or deferred response of an interaction.
   *
   * @param interaction - The interaction whose reply should be edited.
   * @param options - Edit reply options.
   * @returns The edited message or null.
   */
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

  /**
   * Sends a follow-up message to an interaction. Defaults to ephemeral.
   *
   * @param interaction - The interaction to follow up.
   * @param options - Follow-up options.
   * @returns The follow-up message or null.
   */
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

  /**
   * Sends a direct message (DM) to a user.
   *
   * @param userId - The ID of the user to DM.
   * @param content - The message content.
   * @returns The sent DM message or null.
   */
  static async sendDM(
    userId: string,
    content: string
  ): Promise<Message | null> {
    if (!userId) return null
    try {
      const user = await container.client.users.fetch(userId)
      if (!user) return null

      return await user.send(content)
    } catch {
      // User might have DMs disabled, ignore silently
      return null
    }
  }

  /**
   * Replies to an interaction with an error status.
   *
   * @param interaction - The interaction to reply to.
   * @param content - The error message content.
   * @param type - The type of error for emoji selection.
   * @param timeout - Optional timeout in milliseconds to delete the reply.
   * @returns The reply message or response or null.
   */
  static async replyError(
    interaction: OptionalRepliableInteraction,
    content: string,
    type: ErrorType = 'NORMAL',
    timeout?: number
  ): Promise<Message | InteractionResponse | null> {
    const errorEmoji = getEmojiForErrorType(type)
    return this.replyWithContainer(
      interaction,
      `${errorEmoji} ${content}`,
      timeout
    )
  }

  /**
   * Replies to an interaction with a success status.
   *
   * @param interaction - The interaction to reply to.
   * @param content - The success message title/content.
   * @param description - Optional detailed description.
   * @param ephemeral - Whether the reply should be ephemeral (default: true).
   * @param timeout - Optional timeout in milliseconds to delete the reply.
   * @returns The reply message or response or null.
   */
  static async replySuccess(
    interaction: OptionalRepliableInteraction,
    content: string,
    description?: string,
    timeout?: number
  ): Promise<Message | InteractionResponse | null> {
    const successContainerr = new ContainerBuilder().addTextDisplayComponents(
      (t) => t.setContent(`${STATIC_EMOJI.SUCCESS} ${content}`)
    )

    if (description)
      successContainerr
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) => t.setContent(description))

    return this.replyWithContainer(interaction, successContainerr, timeout)
  }

  /**
   * Replies to an interaction using a ContainerBuilder or simple text.
   * Handles both initial replies and edits to deferred/existing replies.
   *
   * @param interaction - The interaction to respond to.
   * @param containerOrText - The content to respond with.
   * @param ephemeral - Whether the response should be ephemeral (default: true).
   * @param timeout - Optional timeout in milliseconds to delete the reply.
   * @returns The reply message or response or null.
   */
  static async replyWithContainer(
    interaction: OptionalRepliableInteraction,
    containerOrText: ContainerBuilder | string,
    timeout?: number
  ): Promise<Message | InteractionResponse | null> {
    if (!interaction) return null

    const container =
      typeof containerOrText === 'string'
        ? new ContainerBuilder().addTextDisplayComponents((t) =>
            t.setContent(containerOrText)
          )
        : containerOrText

    return this.replyWithComponents(interaction, [container], timeout)
  }

  /**
   * Replies to an interaction using multiple components.
   *
   * @param interaction - The interaction to respond to.
   * @param components - The components to respond with.
   * @param ephemeral - Whether the response should be ephemeral (default: true).
   * @param timeout - Optional timeout in milliseconds to delete the reply.
   * @returns The reply message or response or null.
   */
  static async replyWithComponents(
    interaction: OptionalRepliableInteraction,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: any[],
    timeout?: number
  ): Promise<Message | InteractionResponse | null> {
    if (!interaction) return null

    let response: Message | InteractionResponse | null = null

    if (interaction.deferred || interaction.replied) {
      response = await this.editReply(interaction, {
        components,
        flags: ['IsComponentsV2']
      })
    } else {
      response = await this.reply(interaction, {
        components,
        flags: ['IsComponentsV2']
      })
    }

    this.scheduleDelete(interaction, timeout)

    return response
  }
}

/**
 * Creates a ContainerBuilder with a single text display component containing the provided content.
 *
 * @param content - The content to put in the container.
 * @returns A new ContainerBuilder instance.
 */
export const createTextContainer = (content: string) =>
  new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(content))
