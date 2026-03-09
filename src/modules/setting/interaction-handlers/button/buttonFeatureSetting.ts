import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  ChannelType,
  LabelBuilder,
  ModalBuilder
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'

import { SettingHelper } from '~/modules/setting/helpers/SettingHelper'

// Configuration structure for channel selection labels in setting modals
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

// Main configuration mapping for feature setting buttons
const SETTING_CONFIG = {
  [CUSTOM_ID.BTN_CHANNEL_SETTING]: {
    modalCustomId: CUSTOM_ID.MODAL_CHANNEL_SETTING,
    modalTitle: 'Cài đặt chung - Kênh',
    labels: [
      {
        configKey: 'serviceForumChannelId',
        selectCustomId: 'select-service-channel',
        channelType: ChannelType.GuildForum,
        label: 'Kênh diễn đàn dịch vụ',
        description:
          'Các bài đăng chứa hướng dẫn gửi yêu cầu hỗ trợ, confession,... sẽ được tạo ở kênh này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn kênh dịch vụ',
          channelConfiguredButDeleted:
            'Kênh dịch vụ đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập kênh dịch vụ',
          noChannelsInServer: 'Không có kênh diễn đàn nào'
        }
      },
      {
        configKey: 'notificationForumChannelId',
        selectCustomId: 'select-notification-channel',
        channelType: ChannelType.GuildForum,
        label: 'Kênh diễn đàn thông báo',
        description:
          'Các bài đăng chứa thông báo riêng cho từng loại sẽ được tạo ở kênh này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn kênh thông báo',
          channelConfiguredButDeleted:
            'Kênh thông báo đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập kênh thông báo',
          noChannelsInServer: 'Không có kênh diễn đàn nào'
        }
      }
    ]
  },
  [CUSTOM_ID.BTN_CONFESSION_GENERAL_SETTING]: {
    modalCustomId: CUSTOM_ID.MODAL_CONFESSION_GENERAL_SETTING,
    modalTitle: 'Cài đặt hệ thống confession',
    labels: [
      {
        configKey: 'confessionForumChannelId',
        selectCustomId: 'select-confession-forum-channel',
        channelType: ChannelType.GuildForum,
        label: 'Kênh đăng confession',
        description: 'Các bài đăng confession sẽ được tạo ở kênh này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn kênh confession',
          channelConfiguredButDeleted:
            'Kênh confession đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập kênh confession',
          noChannelsInServer: 'Không có kênh diễn đàn nào'
        }
      }
    ]
  },
  [CUSTOM_ID.BTN_TICKET_GENERAL_SETTING]: {
    modalCustomId: CUSTOM_ID.MODAL_TICKET_GENERAL_SETTING,
    modalTitle: 'Cài đặt hệ thống hỗ trợ thành viên',
    labels: [
      {
        configKey: 'ticketCategoryId',
        selectCustomId: 'select-ticket-category',
        channelType: ChannelType.GuildCategory,
        label: 'Danh mục kênh',
        description: 'Các kênh hỗ trợ sẽ được tạo trong danh mục này.',
        placeholders: {
          channelConfiguredAndExists: 'Chọn danh mục kênh',
          channelConfiguredButDeleted:
            'Danh mục kênh đã thiết lập không còn tồn tại',
          channelNotConfigured: 'Chưa thiết lập danh mục kênh',
          noChannelsInServer: 'Không có danh mục nào'
        }
      }
    ]
  }
} as const

type SettingButtonId = keyof typeof SETTING_CONFIG

export class ButtonFeatureSetting extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!(interaction.customId in SETTING_CONFIG)) return this.none()
    return this.some({ buttonId: interaction.customId as SettingButtonId })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return

    const { buttonId } = result
    const config = SETTING_CONFIG[buttonId]

    if (!interaction || !interaction.guild)
      throw new NormalError('Lệnh này chỉ dùng trong máy chủ.')

    const guildConfig = await GuildRepository.findUnique(interaction.guild.id)

    const channelLabels: LabelBuilder[] = config.labels.map(
      (labelConfig: ChannelLabelConfig) => {
        const channelId =
          guildConfig?.[labelConfig.configKey as keyof typeof guildConfig]

        return SettingHelper.createChannelLabel({
          guild: interaction.guild!,
          channelId: channelId as string | null | undefined,
          customId: labelConfig.selectCustomId,
          channelType: labelConfig.channelType,
          label: labelConfig.label,
          description: labelConfig.description,
          placeholders: labelConfig.placeholders
        })
      }
    )

    const modal = new ModalBuilder()
      .setCustomId(config.modalCustomId)
      .setTitle(config.modalTitle)
      .addLabelComponents(...channelLabels)

    await interaction.showModal(modal)
  }
}
