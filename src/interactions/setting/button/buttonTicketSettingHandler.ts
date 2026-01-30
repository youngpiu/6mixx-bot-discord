import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  LabelBuilder,
  ModalBuilder
} from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ButtonTicketSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    if (!interaction.guildId) return

    const ticketConfig = await GuildRepository.getTicketConfig(interaction.guildId)
    const ticketChannelId = ticketConfig?.ticketChannelId

    const select = new ChannelSelectMenuBuilder()
      .setCustomId('select-ticket-channel')
      .setPlaceholder('Chọn kênh gửi yêu cầu hỗ trợ')
      .setChannelTypes([ChannelType.GuildText])

    if (ticketChannelId) {
      select.setDefaultChannels([ticketChannelId])
    }

    const label = new LabelBuilder()
      .setLabel('Kênh tiếp nhận yêu cầu hỗ trợ')
      .setDescription('Hướng dẫn và các phiên hỗ trợ sẽ được tạo ra ở kênh này.')
      .setChannelSelectMenuComponent(select)

    const modal = new ModalBuilder()
      .setCustomId('modal-ticket-setting')
      .setTitle('Cài đặt chung')
      .addLabelComponents(label)

    await interaction.showModal(modal)
  })
}
