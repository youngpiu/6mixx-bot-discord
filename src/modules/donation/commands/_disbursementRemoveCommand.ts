import {
  AutocompleteInteraction,
  ChatInputCommandInteraction
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'

export class DisbursementRemoveCommand {
  public static async autocompleteRun(interaction: AutocompleteInteraction) {
    if (!interaction.guild) return

    const focusedValue = interaction.options.getFocused()

    // Fetch recent disbursements matching the search term
    const { items } = await DisbursementRepository.findMany({
      guildId: interaction.guild.id,
      page: 1,
      limit: 25 // max options for autocomplete
    })

    const filtered = items.filter((d) =>
      d.description.toLowerCase().includes(focusedValue.toLowerCase())
    )

    await interaction.respond(
      filtered.map((d) => ({
        name: `${d.description.slice(0, 80)} - ${d.amount.toLocaleString('vi-VN')}đ`,
        value: d.id
      }))
    )
  }

  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const disbursementId = interaction.options.getString('disbursement', true)

    // Check if it exists before trying to delete
    try {
      await DisbursementRepository.findById(disbursementId)
    } catch {
      throw new NormalError('Không tìm thấy khoản chi này trong hệ thống.')
    }

    await DisbursementRepository.delete(disbursementId)

    await InteractionUtil.replySuccess(
      interaction,
      `Đã xóa khoản chi thành công!`
    )
  }
}
