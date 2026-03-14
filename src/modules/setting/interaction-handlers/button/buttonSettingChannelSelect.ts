import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction, ChannelType, ModalBuilder } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { SettingHelper } from '~/modules/setting/helpers/SettingHelper'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonSettingChannelSelect extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_CHANNEL_CONFIG)
      return this.none()
    const guildConfig = interaction.guild
      ? await SettingRepository.find(interaction.guild.id)
      : null
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!interaction.guild) return

    const { guildConfig } = result
    const labelServiceForum = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.serviceForumChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_SERVICE_FORUM,
      channelType: ChannelType.GuildForum,
      label: 'Kênh dịch vụ',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh dịch vụ',
        channelConfiguredButDeleted:
          'Kênh dịch vụ đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh dịch vụ',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const labelNotificationForum = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.notificationForumChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_NOTIFICATION_FORUM,
      channelType: ChannelType.GuildForum,
      label: 'Kênh thông báo',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh thông báo',
        channelConfiguredButDeleted:
          'Kênh thông báo đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh thông báo',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const labelConfessionForum = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.confessionForumChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_CONFESSION_FORUM,
      channelType: ChannelType.GuildForum,
      label: 'Kênh đăng confession',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh confession',
        channelConfiguredButDeleted:
          'Kênh confession đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh confession',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const labelDisbursementLog = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.disbursementLogChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_DISBURSEMENT_LOG,
      channelType: ChannelType.GuildText,
      label: 'Kênh lưu sao kê khoản chi',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh sao kê',
        channelConfiguredButDeleted:
          'Kênh sao kê đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh sao kê',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const labelTicketCategory = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: guildConfig?.ticketCategoryId,
      customId: CUSTOM_ID.SELECT_SETTING_TICKET_CATEGORY,
      channelType: ChannelType.GuildCategory,
      label: 'Danh mục chứa phiếu/kênh hỗ trợ',
      placeholders: {
        channelConfiguredAndExists: 'Chọn danh mục',
        channelConfiguredButDeleted:
          'Danh mục đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập danh mục',
        noChannelsInServer: 'Không có danh mục nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_CHANNEL_CONFIG)
      .setTitle('Cài đặt toàn bộ kênh')
      .addLabelComponents(
        labelServiceForum,
        labelNotificationForum,
        labelConfessionForum,
        labelDisbursementLog,
        labelTicketCategory
      )

    await interaction.showModal(modal)
  }
}
