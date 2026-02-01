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
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Loại cài đặt')
            .setRequired(true)
            .addChoices(
              { name: '1. Cài đặt chung', value: 'general' },
              { name: '2. Hệ thống hỗ trợ thành viên', value: 'ticket' },
              { name: '3. Hệ thống quyên góp', value: 'donation' },
              { name: '4. Hệ thống Confession', value: 'confession' }
            )
        )
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type', true)

    let container: ContainerBuilder

    switch (type) {
      case 'general':
        container = this.createGeneralSettings()
        break
      case 'ticket':
        container = this.createTicketSettings()
        break
      case 'donation':
        container = this.createDonationSettings()
        break
      case 'confession':
        container = this.createConfessionSettings()
        break
      default:
        return
    }

    await interaction.reply({
      components: [container],
      flags: ['Ephemeral', 'IsComponentsV2']
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.VERY_LONG)
  }

  private createGeneralSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Cài đặt chung'))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Kênh')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-channel-setting')
              .setEmoji(parseEmoji(ICON.HASHTAG))
              .setStyle(ButtonStyle.Primary)
          )
      )
  }

  private createTicketSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Hệ thống hỗ trợ thành viên'))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Cài đặt chung')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-ticket-general-setting')
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
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-ticket-create-notification-thread')
              .setEmoji(parseEmoji(ICON.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
  }

  private createDonationSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Hệ thống quyên góp'))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Gửi hướng dẫn')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-donation-send')
              .setEmoji(parseEmoji(ICON.PAPER_PLANE))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-donation-create-notification-thread')
              .setEmoji(parseEmoji(ICON.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
  }

  private createConfessionSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Hệ thống Confession'))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Cài đặt chung')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-confession-general-setting')
              .setEmoji(parseEmoji(ICON.GEAR))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Gửi hướng dẫn')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-confession-send')
              .setEmoji(parseEmoji(ICON.PAPER_PLANE))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-confession-create-notification-thread')
              .setEmoji(parseEmoji(ICON.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
  }
}
