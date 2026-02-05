import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ContainerBuilder } from 'discord.js'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { lines } from '~/utils/textUtil'

export class ButtonConfessionSendHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-confession-send') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await SettingHelper.createGuideThread({
      interaction,
      channelIdKey: 'serviceForumChannelId',
      threadIdKey: 'confessionTutorialThreadId',
      threadName: '💌 NƠI GỬI CONFESSION 💌',
      messageComponents: [this.createConfessionTutorialMessage()],
      successMessage: 'Bài đăng hướng dẫn gửi confession đã được tạo',
      errorChannelNotConfigured: 'Kênh dịch vụ chưa được thiết lập.',
      errorChannelInvalid: 'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn.'
    })
  })

  private createConfessionTutorialMessage() {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '## Confession',
            'Tại đây, bạn có thể gửi confession ẩn danh trong máy chủ **VNMIXX**.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Lưu ý:**',
            '  - Confession của bạn sẽ được gửi ẩn danh, không ai biết được danh tính người gửi.',
            '  - Không gửi nội dung vi phạm nội quy máy chủ.',
            '  - Vi phạm sẽ bị xử lý nghiêm khắc.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('btn-confession-create')
            .setLabel('Gửi Confession')
            .setStyle(ButtonStyle.Primary)
        )
      )
    return container
  }
}
