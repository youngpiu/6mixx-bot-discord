import { Command } from '@sapphire/framework'
import { ButtonStyle, ChatInputCommandInteraction, ContainerBuilder } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { ICON } from '~/constants/iconConstant'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'
import { parseEmoji } from '~/utils/emojiUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

export class SettingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setting',
      description: '[OWNER] Cài đặt máy chủ VNMIXX',
      preconditions: ['OwnerOnly', 'GuildOnly']
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    )
  }

  public override chatInputRun = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      const container = SettingCommand.createMainSettings()

      await interaction.reply({
        components: [container],
        flags: ['Ephemeral', 'IsComponentsV2']
      })

      await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.VERY_LONG)
    }
  )

  /**
   * Trang chính - hiển thị danh sách các setting categories
   */
  public static createMainSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('## CÀI ĐẶT MÁY CHỦ'))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### 1. Chung')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-setting-nav-general')
              .setEmoji(parseEmoji(ICON.GEAR))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### 2. Hỗ trợ thành viên')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-setting-nav-ticket')
              .setEmoji(parseEmoji(ICON.FLAG))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### 3. Quyên góp')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-setting-nav-donation')
              .setEmoji(parseEmoji(ICON.LAYER_GROUP))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### 4. Confession')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-setting-nav-confession')
              .setEmoji(parseEmoji(ICON.LIGHTBULB_ON))
              .setStyle(ButtonStyle.Primary)
          )
      )
  }
}
