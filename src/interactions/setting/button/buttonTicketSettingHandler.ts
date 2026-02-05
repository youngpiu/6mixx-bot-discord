import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ChannelType, ModalBuilder } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { SettingHelper } from '~/helpers/SettingHelper'
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
    if (interaction.customId !== 'btn-ticket-general-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()

    const config = await GuildRepository.getGuild(interaction.guildId)
    const ticketCategoryId = config?.ticketCategoryId

    const categoryLabel = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: ticketCategoryId,
      customId: 'select-ticket-category',
      channelType: ChannelType.GuildCategory,
      label: 'Danh mục kênh',
      description: 'Các kênh hỗ trợ sẽ được tạo trong danh mục này.',
      placeholders: {
        channelConfiguredAndExists: 'Chọn danh mục kênh',
        channelConfiguredButDeleted: 'Danh mục kênh đã thiết lập không còn tồn tại',
        channelNotConfigured: 'Chưa thiết lập danh mục kênh',
        noChannelsInServer: 'Không có danh mục nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId('modal-ticket-general-setting')
      .setTitle('Cài đặt tính năng hỗ trợ thành viên')
      .addLabelComponents(categoryLabel)

    await interaction.showModal(modal)
  })
}
