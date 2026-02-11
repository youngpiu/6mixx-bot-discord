import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ChannelType, LabelBuilder, ModalBuilder } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { GuildRepository } from '~/repositories/guildRepository'

type ChannelLabelConfig = {
  configKey: string
  selectCustomId: string
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
    if (!(interaction.customId in SETTING_CONFIG)) return this.none()
    return this.some({ buttonId: interaction.customId as SettingButtonId })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { buttonId: SettingButtonId }>(
    async (interaction, result) => {
      if (!result) return

      const config = SETTING_CONFIG[result.buttonId]

      if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()

      const guildConfig = await GuildRepository.getGuild(interaction.guildId)

      // Create all labels based on config
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
