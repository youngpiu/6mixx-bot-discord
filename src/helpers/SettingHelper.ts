import { container } from '@sapphire/pieces'
import {
  BaseMessageOptions,
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  ForumChannel,
  Guild,
  LabelBuilder,
  TextChannel
} from 'discord.js'

import { BadRequestError, GuildOnlyError } from '~/core/errorResponse'

import { getChannelPlaceholder } from '~/utils/channelUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'

type CreateNotificationThreadOptions = {
  interaction: ButtonInteraction
  threadName: string
  oldThreadIdKey:
    | 'ticketNotificationThreadId'
    | 'donationNotificationThreadId'
    | 'confessionNotificationThreadId'
    | 'errorNotificationThreadId'
  updateKey:
    | 'ticketNotificationThreadId'
    | 'donationNotificationThreadId'
    | 'confessionNotificationThreadId'
    | 'errorNotificationThreadId'
  successMessage: string
}

type CreateGuideThreadOptions = {
  interaction: ButtonInteraction
  channelIdKey: 'serviceForumChannelId' | 'confessionForumChannelId'
  threadIdKey: 'ticketTutorialThreadId' | 'donationTutorialThreadId' | 'confessionTutorialThreadId'
  threadName: string
  messageComponents: BaseMessageOptions['components']
  successMessage: string
  errorChannelNotConfigured: string
  errorChannelInvalid: string
}

type CreateChannelLabelOptions = {
  guild: Guild
  channelId: string | null | undefined
  customId: string
  channelType: ChannelType
  label: string
  description: string
  placeholders: {
    channelConfiguredAndExists: string
    channelConfiguredButDeleted: string
    channelNotConfigured: string
    noChannelsInServer: string
  }
}

export class SettingHelper {
  /**
   * Tạo thread thông báo trong kênh thông báo
   */
  public static async createNotificationThread(options: CreateNotificationThreadOptions) {
    const { interaction, threadName, oldThreadIdKey, updateKey, successMessage } = options

    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const config = await GuildRepository.getGuild(interaction.guildId)
    const notificationChannelId = config?.notificationForumChannelId

    if (!notificationChannelId)
      throw new BadRequestError({ description: 'Kênh thông báo chưa được thiết lập.' })

    const notificationChannel = await interaction.guild.channels.fetch(notificationChannelId)
    if (!notificationChannel)
      throw new BadRequestError({ description: 'Kênh thông báo chưa được thiết lập.' })

    if (
      notificationChannel.type !== ChannelType.GuildText &&
      notificationChannel.type !== ChannelType.GuildForum
    ) {
      throw new BadRequestError({
        description: 'Kênh thông báo phải là kênh văn bản hoặc diễn đàn.'
      })
    }

    const channel = notificationChannel as TextChannel | ForumChannel

    const oldThreadId = config?.[oldThreadIdKey]
    if (oldThreadId) {
      try {
        const oldThread = await channel.threads.fetch(oldThreadId)
        if (oldThread) await oldThread.delete()
      } catch (error) {
        container.logger.error(error)
      }
    }

    let thread

    if (notificationChannel.type === ChannelType.GuildForum) {
      thread = await (notificationChannel as ForumChannel).threads.create({
        name: threadName,
        message: { content: threadName }
      })
    } else {
      thread = await (notificationChannel as TextChannel).threads.create({
        name: threadName,
        type: ChannelType.PublicThread
      })
    }

    await GuildRepository.updateConfig(interaction.guildId, {
      [updateKey]: thread.id
    })

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          description: `${successMessage}: <#${thread.id}>`
        })
      ]
    })
    await deleteReplyInteraction(interaction)
  }

  /**
   * Tạo thread hướng dẫn trong kênh forum (Service/Confession)
   */
  public static async createGuideThread(options: CreateGuideThreadOptions) {
    const {
      interaction,
      channelIdKey,
      threadIdKey,
      threadName,
      messageComponents,
      successMessage,
      errorChannelNotConfigured,
      errorChannelInvalid
    } = options

    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const config = await GuildRepository.getGuild(interaction.guildId)
    const forumChannelId = config?.[channelIdKey]

    if (!forumChannelId) throw new BadRequestError({ description: errorChannelNotConfigured })

    const forumChannel = await interaction.guild.channels.fetch(forumChannelId)

    if (!forumChannel || !forumChannel.isThreadOnly()) {
      throw new BadRequestError({ description: errorChannelInvalid })
    }

    // Delete old thread if exists
    const oldThreadId = config?.[threadIdKey]
    if (oldThreadId) {
      try {
        const oldThread = await forumChannel.threads.fetch(oldThreadId)
        if (oldThread) await oldThread.delete()
      } catch (error) {
        container.logger.error(error)
      }
    }

    // Create new thread
    const thread = await forumChannel.threads.create({
      name: threadName,
      message: {
        components: messageComponents,
        flags: ['IsComponentsV2']
      }
    })

    await GuildRepository.updateConfig(interaction.guildId, {
      [threadIdKey]: thread.id
    })

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          description: `${successMessage}: <#${thread.id}>`
        })
      ]
    })
    await deleteReplyInteraction(interaction)
  }

  public static createChannelLabel(options: CreateChannelLabelOptions): LabelBuilder {
    const { guild, channelId, customId, channelType, label, description, placeholders } = options

    const result = getChannelPlaceholder(guild, channelId, channelType, placeholders)

    const selectMenu = new ChannelSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(result.placeholder)
      .setChannelTypes([channelType])
      .setRequired(true)

    if (channelId && result.exists) {
      selectMenu.setDefaultChannels([channelId])
    }

    return new LabelBuilder()
      .setLabel(label)
      .setDescription(description)
      .setChannelSelectMenuComponent(selectMenu)
  }
}
