import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ContainerBuilder } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { EMOJI } from '~/constants/iconConstant'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { parseEmoji } from '~/utils/emojiUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
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
      await interaction.deferUpdate()

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

      await interaction.editReply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.VERY_LONG)
    }
  )

  /**
   * Creates a standardized "Back" button to return to the previous menu.
   */
  private static createBackButton(): ButtonBuilder {
    return new ButtonBuilder()
      .setCustomId('btn-setting-nav-back')
      .setEmoji(parseEmoji(EMOJI.NORMAL.ARROW_LEFT))
      .setStyle(ButtonStyle.Primary)
  }

  /**
   * Generates the General Settings menu container.
   * Includes options for global channel configuration and error notifications.
   */
  public static createGeneralSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(lines('# Cài đặt hệ thống')))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Kênh')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-channel-setting')
              .setEmoji(parseEmoji(EMOJI.NORMAL.HASHTAG))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo lỗi')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-general-create-error-notification-thread')
              .setEmoji(parseEmoji(EMOJI.NORMAL.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((row) =>
        row.addComponents(ButtonSettingNavHandler.createBackButton())
      )
  }

  /**
   * Generates the Ticket Settings menu container.
   * Includes options for general setup, sending guides, and creating notification threads.
   */
  public static createTicketSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(lines('# Cài đặt tính năng hỗ trợ thành viên'))
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Cài đặt chung')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-ticket-general-setting')
              .setEmoji(parseEmoji(EMOJI.NORMAL.GEAR))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Gửi hướng dẫn')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-ticket-send')
              .setEmoji(parseEmoji(EMOJI.NORMAL.PAPER_PLANE))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-ticket-create-notification-thread')
              .setEmoji(parseEmoji(EMOJI.NORMAL.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((row) =>
        row.addComponents(ButtonSettingNavHandler.createBackButton())
      )
  }

  /**
   * Generates the Donation Settings menu container.
   */
  public static createDonationSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(lines('# Cài đặt tính năng quyên góp')))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Gửi hướng dẫn')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-donation-send')
              .setEmoji(parseEmoji(EMOJI.NORMAL.PAPER_PLANE))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-donation-create-notification-thread')
              .setEmoji(parseEmoji(EMOJI.NORMAL.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((row) =>
        row.addComponents(ButtonSettingNavHandler.createBackButton())
      )
  }

  /**
   * Generates the Confession Settings menu container.
   */
  public static createConfessionSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(lines('# Cài đặt tính năng confession')))
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Cài đặt chung')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-confession-general-setting')
              .setEmoji(parseEmoji(EMOJI.NORMAL.GEAR))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Gửi hướng dẫn')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-confession-send')
              .setEmoji(parseEmoji(EMOJI.NORMAL.PAPER_PLANE))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(lines('### Tạo kênh thông báo')))
          .setButtonAccessory((button) =>
            button
              .setCustomId('btn-confession-create-notification-thread')
              .setEmoji(parseEmoji(EMOJI.NORMAL.PLUS))
              .setStyle(ButtonStyle.Primary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((row) =>
        row.addComponents(ButtonSettingNavHandler.createBackButton())
      )
  }
}
