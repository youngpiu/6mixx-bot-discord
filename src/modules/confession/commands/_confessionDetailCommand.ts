import { RequiresGuildContext } from '@sapphire/decorators'
import {
  ButtonBuilder,
  ButtonStyle,
  Colors,
  type InteractionEditReplyOptions,
  type RepliableInteraction
} from 'discord.js'

import { ConfessionStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { DetailBuilder } from '~/shared/components/DetailBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { ConfessionHelper } from '~/modules/confession/helpers/ConfessionHelper'
import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'

export class ConfessionDetailCommand {
  @RequiresGuildContext()
  public static async run(
    interaction: RepliableInteraction,
    code?: string | null
  ) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const confessionCode =
      code ||
      (interaction.isChatInputCommand()
        ? interaction.options.getString('code')
        : null)

    if (!confessionCode) {
      throw new NormalError(
        'Vui lòng lựa chọn một confession mà bạn muốn xem thông tin chi tiết.'
      )
    }

    const confession = await ConfessionRepository.findByCode(confessionCode)

    if (!confession) {
      throw new NormalError(`Không tìm thấy confession này.`)
    }

    const statusText = ConfessionHelper.getStatusLabel(confession.status)
    const color =
      confession.status === ConfessionStatus.PENDING
        ? Colors.Yellow
        : confession.status === ConfessionStatus.APPROVED
          ? Colors.Green
          : Colors.Red

    const fields: [string, string][] = [
      ['Trạng thái', `**${statusText}**`],
      ['Loại', confession.isAnonymous ? 'Ẩn danh' : 'Công khai']
    ]

    if (!confession.isAnonymous) {
      fields.push([
        'Người gửi',
        confession.author ? `<@${confession.author.id}>` : 'Không rõ'
      ])
    }

    fields.push(
      [
        'Thời gian gửi',
        `<t:${Math.floor(confession.createdAt.getTime() / 1000)}:R>`
      ],
      ['Nội dung', `\n${confession.content}`]
    )

    if (confession.forumPostId) {
      fields.push(['Bài đăng', `<#${confession.forumPostId}>`])
    }

    const builder = new DetailBuilder({
      title: `Thông tin confession \`#${confession.code}\``,
      color
    }).addFields(fields)

    const actionRows: ButtonBuilder[][] = []

    const btnApprove = new ButtonBuilder()
      .setCustomId(`${CUSTOM_ID.BTN_CONFESSION_APPROVE_PREFIX}${confession.id}`)
      .setLabel('Duyệt')
      .setStyle(ButtonStyle.Success)

    const btnReject = new ButtonBuilder()
      .setCustomId(`${CUSTOM_ID.BTN_CONFESSION_REJECT_PREFIX}${confession.id}`)
      .setLabel('Từ chối')
      .setStyle(ButtonStyle.Danger)

    if (confession.status === ConfessionStatus.PENDING) {
      actionRows.push([btnApprove, btnReject])
    } else if (confession.status === ConfessionStatus.REJECTED) {
      actionRows.push([btnApprove])
    }

    actionRows.forEach((rowButtons) => {
      builder.addActionRow(rowButtons)
    })

    const response: InteractionEditReplyOptions = {
      components: builder.build(),
      flags: ['IsComponentsV2']
    }

    await InteractionUtil.editReply(interaction, response)
  }
}
