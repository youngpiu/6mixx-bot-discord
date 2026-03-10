import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonStyle,
  ContainerBuilder,
  Interaction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder
} from 'discord.js'

import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

type SettingNavType = 'general' | 'ticket' | 'donation' | 'confession'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.MessageComponent
})
export class SelectSettingNav extends InteractionHandler {
  public override parse(interaction: Interaction) {
    if (!interaction.isMessageComponent() || !interaction.isStringSelectMenu())
      return this.none()
    const customId = interaction.customId

    if (customId !== CUSTOM_ID.SELECT_SETTING_NAV) return this.none()

    const navType = interaction.values[0] as SettingNavType
    return this.some({ navType })
  }

  public async run(
    interaction: StringSelectMenuInteraction,
    parsedData?: { navType: SettingNavType }
  ) {
    if (!parsedData) return
    await interaction.deferUpdate()

    const { navType } = parsedData
    let container

    switch (navType) {
      case 'general':
        container = SelectSettingNav.createGeneralSettings()
        break
      case 'ticket':
        container = SelectSettingNav.createTicketSettings()
        break
      case 'donation':
        container = SelectSettingNav.createDonationSettings()
        break
      case 'confession':
        container = SelectSettingNav.createConfessionSettings()
        break
      default:
        return
    }

    InteractionUtil.editReply(interaction, {
      components: [container],
      flags: ['IsComponentsV2']
    })
  }

  // Helper to generate the unified select menu for navigating settings categories.
  private static generateSelectMenu(currentSelection: SettingNavType) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_ID.SELECT_SETTING_NAV)
        .setPlaceholder('Chọn mục cài đặt...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('1. Cài đặt chung')
            .setValue('general')
            .setDefault(currentSelection === 'general'),
          new StringSelectMenuOptionBuilder()
            .setLabel('2. Cài đặt hệ thống hỗ trợ thành viên')
            .setValue('ticket')
            .setDefault(currentSelection === 'ticket'),
          new StringSelectMenuOptionBuilder()
            .setLabel('3. Cài đặt hệ thống quyên góp')
            .setValue('donation')
            .setDefault(currentSelection === 'donation'),
          new StringSelectMenuOptionBuilder()
            .setLabel('4. Cài đặt hệ thống confession')
            .setValue('confession')
            .setDefault(currentSelection === 'confession')
        )
    )
  }

  // Generates the General Settings menu container.
  // Includes options for global channel configuration and error notifications.
  public static createGeneralSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addActionRowComponents(() => this.generateSelectMenu('general'))
      .addSeparatorComponents((separator) =>
        separator.setSpacing(2).setDivider(false)
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`${ANIMATED_EMOJI.BLUE_DOT} **Kênh**`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_CHANNEL_SETTING)
              .setLabel('Thiết lập')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              `${ANIMATED_EMOJI.BLUE_DOT} **Tạo kênh để thông báo lỗi**`
            )
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(
                CUSTOM_ID.BTN_GENERAL_CREATE_ERROR_NOTIFICATION_THREAD
              )
              .setLabel('Tạo')
              .setStyle(ButtonStyle.Secondary)
          )
      )
  }

  // Generates the Ticket Settings menu container.
  // Includes options for general setup, sending guides, and creating notification threads.
  public static createTicketSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addActionRowComponents(() => this.generateSelectMenu('ticket'))
      .addSeparatorComponents((separator) =>
        separator.setSpacing(2).setDivider(false)
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`${ANIMATED_EMOJI.BLUE_DOT} **Kênh**`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_TICKET_GENERAL_SETTING)
              .setLabel('Thiết lập')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`${ANIMATED_EMOJI.BLUE_DOT} **Gửi hướng dẫn**`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_TICKET_SEND)
              .setLabel('Gửi')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              `${ANIMATED_EMOJI.BLUE_DOT} **Tạo kênh để thông báo**`
            )
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_TICKET_CREATE_NOTIFICATION_THREAD)
              .setLabel('Tạo')
              .setStyle(ButtonStyle.Secondary)
          )
      )
  }

  // Generates the Donation Settings menu container.
  public static createDonationSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addActionRowComponents(() => this.generateSelectMenu('donation'))
      .addSeparatorComponents((separator) =>
        separator.setSpacing(2).setDivider(false)
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`${ANIMATED_EMOJI.BLUE_DOT} **Kênh**`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_DISBURSEMENT_LOG_SETTING)
              .setLabel('Thiết lập')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`${ANIMATED_EMOJI.BLUE_DOT} **Gửi hướng dẫn**`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_DONATION_SEND)
              .setLabel('Gửi')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              `${ANIMATED_EMOJI.BLUE_DOT} **Tạo kênh để thông báo**`
            )
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_DONATION_CREATE_NOTIFICATION_THREAD)
              .setLabel('Tạo')
              .setStyle(ButtonStyle.Secondary)
          )
      )
  }

  // Generates the Confession Settings menu container.
  public static createConfessionSettings(): ContainerBuilder {
    return new ContainerBuilder()
      .addActionRowComponents(() => this.generateSelectMenu('confession'))
      .addSeparatorComponents((separator) =>
        separator.setSpacing(2).setDivider(false)
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`${ANIMATED_EMOJI.BLUE_DOT} **Kênh**`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_CONFESSION_GENERAL_SETTING)
              .setLabel('Thiết lập')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`${ANIMATED_EMOJI.BLUE_DOT} **Gửi hướng dẫn**`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_CONFESSION_SEND)
              .setLabel('Gửi')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              `${ANIMATED_EMOJI.BLUE_DOT} **Tạo kênh để thông báo**`
            )
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(CUSTOM_ID.BTN_CONFESSION_CREATE_NOTIFICATION_THREAD)
              .setLabel('Tạo')
              .setStyle(ButtonStyle.Secondary)
          )
      )
  }
}
