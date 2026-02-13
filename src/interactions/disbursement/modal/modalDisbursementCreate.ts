import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { BadRequestError, GuildOnlyError } from '~/core/errorResponse'

import { DisbursementHelper } from '~/helpers/DisbursementHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DisbursementRepository } from '~/repositories/disbursementRepository'

export class ModalDisbursementCreateHandler extends InteractionHandler {
  /**
   * Handles the creation of a new disbursement via modal submission.
   */
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== 'modal-disbursement-create') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new GuildOnlyError()
    }

    const amountInput = interaction.fields.getTextInputValue('amount')
    const description = interaction.fields.getTextInputValue('description')

    // Convert input string to number
    const amount = this.parseAmount(amountInput)

    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestError({
        description: 'Số tiền không hợp lệ. Vui lòng nhập số tiền lớn hơn 0.'
      })
    }

    // Verify guild budget availability
    const availableBudget = await DisbursementRepository.getAvailableBudget(interaction.guildId)

    if (amount > availableBudget) {
      throw new BadRequestError({
        description: `Số tiền giải ngân (${amount.toLocaleString('vi-VN')}đ) vượt quá ngân sách khả dụng (${availableBudget.toLocaleString('vi-VN')}đ).`
      })
    }

    // Create new disbursement record
    const disbursement = await DisbursementRepository.create({
      guildId: interaction.guildId,
      amount,
      description,
      createdBy: interaction.user.id
    })

    // Send disbursement notification
    await DisbursementHelper.sendDisbursementNotification({
      guildId: interaction.guildId,
      disbursement: {
        amount: disbursement.amount,
        description: disbursement.description,
        createdAt: disbursement.createdAt,
        createdBy: disbursement.createdBy
      }
    })

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Tạo giải ngân thành công',
          description: `Đã tạo khoản giải ngân ${amount.toLocaleString('vi-VN')}đ.\n\n**Ngân sách còn lại:** ${(availableBudget - amount).toLocaleString('vi-VN')}đ`
        })
      ]
    })

    await deleteReplyInteraction(interaction)
  })

  private parseAmount(input: string): number {
    const cleaned = input
      .toLowerCase()
      .replace(/[,.\\s]/g, '')
      .replace(/đ$/, '')
      .replace(/vnd$/, '')
      .replace(/k$/, '000')

    return parseInt(cleaned, 10)
  }
}
