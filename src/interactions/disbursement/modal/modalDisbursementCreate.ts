import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { DisbursementHelper } from '~/helpers/DisbursementHelper'
import { InteractionUtil } from '~/utils/messageUtil'

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
    if (interaction.customId !== CUSTOM_ID.MODAL_DISBURSEMENT_CREATE) return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ dùng trong máy chủ.')
    }

    const amountInput = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_AMOUNT)
    const description = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_DESCRIPTION)

    const amount = this.parseAmount(amountInput)

    if (isNaN(amount) || amount <= 0) {
      throw new NormalError('Số tiền không hợp lệ. Vui lòng nhập số tiền lớn hơn 0.')
    }

    const availableBudget = await DisbursementRepository.getAvailableBudget(interaction.guildId)

    if (amount > availableBudget) {
      throw new NormalError(
        `Số tiền giải ngân (${amount.toLocaleString('vi-VN')}đ) vượt quá ngân sách khả dụng (${availableBudget.toLocaleString('vi-VN')}đ).`
      )
    }

    const disbursement = await DisbursementRepository.create({
      guildId: interaction.guildId,
      amount,
      description,
      createdBy: interaction.user.id
    })

    await DisbursementHelper.sendDisbursementNotification({
      guildId: interaction.guildId,
      disbursement: {
        amount: disbursement.amount,
        description: disbursement.description,
        createdAt: disbursement.createdAt,
        createdBy: disbursement.createdBy
      }
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Đã tạo khoản giải ngân ${amount.toLocaleString('vi-VN')}đ.\n\n**Ngân sách còn lại:** ${(availableBudget - amount).toLocaleString('vi-VN')}đ`
    )
  }

  private parseAmount(input: string): number {
    const cleaned = input
      .toLowerCase()
      .replace(/[,.\s]/g, '')
      .replace(/đ$/, '')
      .replace(/vnd$/, '')
      .replace(/k$/, '000')

    return parseInt(cleaned, 10)
  }
}
