import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ContainerBuilder } from 'discord.js'

import { ICON } from '~/constants/iconConstant'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { parseEmoji } from '~/utils/emojiUtil'
import { lines } from '~/utils/textUtil'

import { SettingCommand } from '~/commands/setting/settingCommand'

type SettingNavType = 'general' | 'ticket' | 'donation' | 'confession' | 'back'

export class ButtonSettingNavHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    const customId = interaction.customId

    if (!customId.startsWith('btn-setting-nav-')) return this.none()

    const navType = customId.replace('btn-setting-nav-', '') as SettingNavType
    return this.some({ navType })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { navType: SettingNavType }>(
    async (interaction, result) => {
      if (!result) return

      const { navType } = result
      let container

      switch (navType) {
        case 'general':
          container = ButtonSettingNavHandler.createGeneralSettings()
          break
        case 'ticket':
          container = ButtonSettingNavHandler.createTicketSettings()
          break
        case 'donation':
          container = ButtonSettingNavHandler.createDonationSettings()
          break
        case 'confession':
          container = ButtonSettingNavHandler.createConfessionSettings()
          break
        case 'back':
          container = SettingCommand.createMainSettings()
          break
        default:
          return
      }

      await interaction.update({
        components: [container],
        flags: ['IsComponentsV2']
      })
    }
  )

  /**
   * Container General với nút Back
   */
  public static createGeneralSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Cài đặt hệ thống'))
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
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo lỗi')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-general-create-error-notification-thread')
              .setEmoji(parseEmoji(ICON.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('btn-setting-nav-back')
            .setLabel('Quay lại')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  }

  /**
   * Container Ticket với nút Back
   */
  public static createTicketSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Cài đặt tính năng hỗ trợ thành viên'))
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
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('btn-setting-nav-back')
            .setLabel('Quay lại')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  }

  /**
   * Container Donation với nút Back
   */
  public static createDonationSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Cài đặt tính năng quyên góp'))
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
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('btn-setting-nav-back')
            .setLabel('Quay lại')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  }

  /**
   * Container Confession với nút Back
   */
  public static createConfessionSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent('# Cài đặt tính năng Confession'))
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
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('btn-setting-nav-back')
            .setLabel('Quay lại')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  }
}
