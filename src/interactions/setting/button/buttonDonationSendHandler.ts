import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ContainerBuilder } from 'discord.js'
import { env } from '~/config/env'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { lines } from '~/utils/textUtil'

export class ButtonDonationSendHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-donation-send') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await SettingHelper.createGuideThread({
      interaction,
      channelIdKey: 'serviceForumChannelId',
      threadIdKey: 'donationTutorialThreadId',
      threadName: '💝 NƠI GÓP GẠCH NUÔI BOT 💝',
      messageComponents: [this.createDonationTutorialMessage()],
      successMessage: 'Bài đăng hướng dẫn quyên góp đã được tạo',
      errorChannelNotConfigured: 'Kênh dịch vụ chưa được thiết lập.',
      errorChannelInvalid: 'Kênh dịch vụ không tồn tại hoặc không phải là kênh diễn đàn.'
    })
  })

  private createDonationTutorialMessage() {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '## Góp gạch nuôi BOT',
            'Tại đây, bạn có thể thực hiện quyên góp ủng hộ để duy trì hoạt động của **BOT 6MIXX**.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Cam kết:**',
            '  - Khoản quyên góp được sử dụng cho chi phí thuê máy chủ và các chi phí phát sinh cho hoạt động của BOT.',
            '  - Không sử dụng khoản tiền này cho mục đích cá nhân hoặc các dịch vụ không liên quan đến BOT.',
            '  - Thông tin chuyển khoản được tiếp nhận theo hình thức ẩn danh và không hiển thị công khai trong máy chủ.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Lưu ý:**',
            '  - Không một ai kể cả **Ban quản lý** có thể biết được danh tính người quyên góp.',
            '  - Việc quyên góp không tạo ra bất kỳ hình thức ưu tiên, đặc quyền hoặc miễn trừ nào khi xử lý vi phạm nội quy máy chủ **VNMIXX**.',
            `  - <@${env.BOT_OWNER_DISCORD_ID}> chịu **trách nhiệm cá nhân** hoàn toàn về mọi cam kết của chính mình đối với người quyên góp.`
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            '- **Đọc thêm:**',
            '  - [VPS là gì?](https://fptshop.com.vn/tin-tuc/thu-thuat/vps-la-gi-159221)',
            '  - [Tại sao BOT DISCORD cần VPS?](https://chat.openai.com/?q=T%E1%BA%A1i%20sao%20BOT%20DISCORD%20c%E1%BA%A7n%20VPS%3F)'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('btn-donation-create')
            .setLabel('Quyên góp')
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId('btn-donation-stats')
            .setLabel('Thống kê')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('btn-donation-expense')
            .setLabel('Các khoản chi')
            .setStyle(ButtonStyle.Secondary)
        )
      )
    return container
  }
}
