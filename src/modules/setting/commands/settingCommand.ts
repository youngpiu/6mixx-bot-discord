import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder
} from 'discord.js'

import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

@RegisterChatInputCommand((builder) =>
  builder.setName('setting').setDescription('[OWNER] Cài đặt máy chủ VNMIXX')
)
@ApplyOptions<Command.Options>({
  name: 'setting',
  description: '[OWNER] Cài đặt máy chủ VNMIXX',
  preconditions: ['OwnerOnly']
})
export class SettingCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `### ${ANIMATED_EMOJI.WING_LEFT} **BẢNG ĐIỀU KHIỂN CÀI ĐẶT** ${ANIMATED_EMOJI.WING_RIGHT}`,
            '-# Tại đây, bạn có thể cấu hình toàn bộ hệ thống kênh và nhiều thứ khác.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_SETTING_CHANNEL_CONFIG)
            .setLabel('Cài đặt toàn bộ kênh')
            .setStyle(ButtonStyle.Secondary)
        )
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_SETTING_SYNC_GUIDES)
            .setLabel('Tạo/chỉnh sửa toàn bộ kênh hướng dẫn')
            .setStyle(ButtonStyle.Secondary)
        )
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_SETTING_SYNC_NOTIFICATIONS)
            .setLabel('Tạo/chỉnh sửa toàn bộ kênh thông báo')
            .setStyle(ButtonStyle.Secondary)
        )
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(CUSTOM_ID.BTN_SETTING_WORDCHAIN_CHANNEL)
            .setLabel('Cài đặt kênh nối từ')
            .setStyle(ButtonStyle.Secondary)
        )
      )

    await InteractionUtil.editReply(interaction, {
      components: [container],
      flags: ['IsComponentsV2']
    })
  }
}
