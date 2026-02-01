import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  LabelBuilder,
  ModalBuilder
} from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { getChannelPlaceholder } from '~/utils/channelUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ButtonTicketSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-general-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()

    const config = await GuildRepository.getGuild(interaction.guildId)
    const ticketCategoryId = config?.ticketCategoryId

    const categoryResult = getChannelPlaceholder(
      interaction.guild,
      ticketCategoryId,
      ChannelType.GuildCategory,
      {
        channelConfiguredAndExists: 'Chọn danh mục',
        channelConfiguredButDeleted: 'Danh mục bạn đã cài đặt không tồn tại',
        channelNotConfigured: 'Chưa cài đặt danh mục',
        noChannelsInServer: 'Không có danh mục nào'
      }
    )

    const categorySelect = new ChannelSelectMenuBuilder()
      .setCustomId('select-ticket-category')
      .setPlaceholder(categoryResult.placeholder)
      .setChannelTypes([ChannelType.GuildCategory])

    if (ticketCategoryId && categoryResult.exists) {
      categorySelect.setDefaultChannels([ticketCategoryId])
    }

    const categoryLabel = new LabelBuilder()
      .setLabel('Danh mục kênh')
      .setDescription('Các kênh hỗ trợ sẽ được tạo trong danh mục này.')
      .setChannelSelectMenuComponent(categorySelect)

    const modal = new ModalBuilder()
      .setCustomId('modal-ticket-general-setting')
      .setTitle('Cài đặt chung')
      .addLabelComponents(categoryLabel)

    await interaction.showModal(modal)
  })
}
