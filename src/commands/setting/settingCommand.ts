import { Command } from '@sapphire/framework'
import { ButtonStyle, ChatInputCommandInteraction, ContainerBuilder } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { ICON } from '~/constants/iconConstant'

import { parseEmoji } from '~/utils/emojiUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

export class SettingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setting',
      description: '[OWNER] Cài đặt máy chủ',
      preconditions: ['OwnerOnly', 'GuildOnly']
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `# Cài đặt máy chủ ${interaction.guild?.name}`,
            'Bấm vào nút tương ứng để tiến hành thay đổi cấu hình máy chủ.'
          )
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((text) => text.setContent('## 1. Hệ thống hỗ trợ thành viên'))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Cài đặt chung')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-ticket-setting')
              .setEmoji(parseEmoji(ICON.GEAR))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Gửi hướng dẫn')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-ticket-send')
              .setEmoji(parseEmoji(ICON.PAPER_PLANE))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)

    await interaction.reply({
      components: [container],
      flags: ['Ephemeral', 'IsComponentsV2']
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.VERY_LONG)
  }
}
