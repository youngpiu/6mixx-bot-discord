import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ChannelType, ModalBuilder } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ButtonConfessionSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-confession-general-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()

    const config = await GuildRepository.getGuild(interaction.guildId)
    const confessionForumChannelId = config?.confessionForumChannelId

    // Forum channel select
    const forumLabel = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: confessionForumChannelId,
      customId: 'select-confession-forum-channel',
      channelType: ChannelType.GuildForum,
      label: 'Kênh confession',
      description: 'Kênh diễn đàn để đăng các confession.',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh confession',
        channelConfiguredButDeleted: 'Kênh confession đã thiết lập không còn tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh confession',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId('modal-confession-general-setting')
      .setTitle('Cài đặt Confession')
      .addLabelComponents(forumLabel)

    await interaction.showModal(modal)
  })
}
