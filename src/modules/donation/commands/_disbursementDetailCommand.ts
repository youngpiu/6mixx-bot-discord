import {
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { DetailBuilder } from '~/shared/components/DetailBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'

export class DisbursementDetailCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const code = interaction.options.getString('code', true)

    const disbursement = await DisbursementRepository.findByCode(
      interaction.guild!.id,
      code
    )

    if (!disbursement) {
      throw new NormalError(`Không tìm thấy khoản chi này.`)
    }

    const fields: [string, string][] = [
      ['Số tiền', `**${disbursement.amount.toLocaleString('vi-VN')}đ**`],
      ['Mô tả', `**${disbursement.description}**`],
      [
        'Thời gian tạo',
        `<t:${Math.floor(disbursement.createdAt.getTime() / 1000)}:R>`
      ],
      ['Đường dẫn tin nhắn', `**[Xem tại đây](${disbursement.messageUrl})**`]
    ]

    const builder = new DetailBuilder({
      title: `Chi tiết khoản chi \`#${disbursement.code}\``
    }).addFields(fields)

    const btnDelete = new ButtonBuilder()
      .setCustomId(
        `${CUSTOM_ID.BTN_DISBURSEMENT_DELETE_PREFIX}${disbursement.id}`
      )
      .setLabel('Xóa')
      .setStyle(ButtonStyle.Danger)

    builder.addActionRow([btnDelete])

    await InteractionUtil.editReply(interaction, {
      components: builder.build(),
      flags: [MessageFlags.IsComponentsV2]
    })
  }
}
