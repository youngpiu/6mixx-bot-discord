import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ChannelType, LabelBuilder, ModalBuilder } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { GuildRepository } from '~/repositories/guildRepository'

// Configuration structure for channel selection labels in setting modals
type ChannelLabelConfig = {
  configKey: string // Key in GuildConfig to update/read
  selectCustomId: string // Custom ID for the channel select menu
  channelType: ChannelType // Required channel type (Forum, Category, etc.)
  label: string // Label text above the select menu
  description: string // Description text
  placeholders: {
    channelConfiguredAndExists: string
    channelConfiguredButDeleted: string
    channelNotConfigured: string
    noChannelsInServer: string
  }
}

// Main configuration mapping for feature setting buttons
// Maps button IDs to their corresponding modal configuration and channel selectors
const SETTING_CONFIG = {
  'btn-channel-setting': {
    modalCustomId: 'modal-channel-setting',
    modalTitle: 'Cài đặt kênh hệ thống',
    labels: [
      {
        configKey: 'serviceForumChannelId',
        selectCustomId: 'select-service-channel',
        channelType: ChannelType.GuildForum,
        label: 'Kênh dịch vụ',
        description:
          'Các bài hướng dẫn về các gửi yêu cầu hỗ trợ, quyên góp,... sẽ được tạo ở kênh này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn kênh dịch vụ',
          channelConfiguredButDeleted: 'Kênh dịch vụ đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập kênh dịch vụ',
          noChannelsInServer: 'Không có kênh diễn đàn nào'
        }
      },
      {
        configKey: 'notificationForumChannelId',
        selectCustomId: 'select-notification-channel',
        channelType: ChannelType.GuildForum,
        label: 'Kênh thông báo',
        description: 'Các kênh thông báo riêng cho từng loại sẽ được tạo ở kênh này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn kênh thông báo',
          channelConfiguredButDeleted: 'Kênh thông báo đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập kênh thông báo',
          noChannelsInServer: 'Không có kênh diễn đàn nào'
        }
      }
    ]
  },
  'btn-confession-general-setting': {
    modalCustomId: 'modal-confession-general-setting',
    modalTitle: 'Cài đặt tính năng confession',
    labels: [
      {
        configKey: 'confessionForumChannelId',
        selectCustomId: 'select-confession-forum-channel',
        channelType: ChannelType.GuildForum,
        label: 'Kênh chứa confession',
        description: 'Các bài đăng confession sẽ được tạo ở kênh này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn kênh confession',
          channelConfiguredButDeleted: 'Kênh confession đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập kênh confession',
          noChannelsInServer: 'Không có kênh diễn đàn nào'
        }
      }
    ]
  },
  'btn-ticket-general-setting': {
    modalCustomId: 'modal-ticket-general-setting',
    modalTitle: 'Cài đặt tính năng hỗ trợ thành viên',
    labels: [
      {
        configKey: 'ticketCategoryId',
        selectCustomId: 'select-ticket-category',
        channelType: ChannelType.GuildCategory,
        label: 'Danh mục kênh',
        description: 'Các kênh hỗ trợ sẽ được tạo trong danh mục này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn danh mục kênh',
          channelConfiguredButDeleted: 'Danh mục kênh đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập danh mục kênh',
          noChannelsInServer: 'Không có danh mục nào'
        }
      }
    ]
  }
} as const

type SettingButtonId = keyof typeof SETTING_CONFIG

export class ButtonFeatureSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    // Only handle known setting buttons from the config
    if (!(interaction.customId in SETTING_CONFIG)) return this.none()
    return this.some({ buttonId: interaction.customId as SettingButtonId })
  }

  // Handles the button click to open the configuration modal
  public run = asyncInteractionHandler<ButtonInteraction, { buttonId: SettingButtonId }>(
    async (interaction, result) => {
      if (!result) return

      const config = SETTING_CONFIG[result.buttonId]

      if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()

      const guildConfig = await GuildRepository.getGuild(interaction.guildId)

      // Create all channel select labels dynamically based on config
      // This populates default values if they are already set in the database
      const channelLabels: LabelBuilder[] = config.labels.map((labelConfig: ChannelLabelConfig) => {
        const channelId = guildConfig?.[labelConfig.configKey as keyof typeof guildConfig]

        return SettingHelper.createChannelLabel({
          guild: interaction.guild!,
          channelId: channelId as string | null | undefined,
          customId: labelConfig.selectCustomId,
          channelType: labelConfig.channelType,
          label: labelConfig.label,
          description: labelConfig.description,
          placeholders: labelConfig.placeholders
        })
      })

      const modal = new ModalBuilder()
        .setCustomId(config.modalCustomId)
        .setTitle(config.modalTitle)
        .addLabelComponents(...channelLabels)

      await interaction.showModal(modal)
    }
  )
}
