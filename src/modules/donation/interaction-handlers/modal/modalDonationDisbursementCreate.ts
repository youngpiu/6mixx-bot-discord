import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalDonationDisbursementCreate extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_DISBURSEMENT_CREATE) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const amountStr = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_DISBURSEMENT_AMOUNT
    )
    const description = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_DISBURSEMENT_DESCRIPTION
    )

    // Use getUploadedFiles instead of getTextInputValue for FileUploadBuilder
    const uploadedFiles = interaction.fields.getUploadedFiles(
      CUSTOM_ID.UPLOAD_DISBURSEMENT_IMAGES
    )

    const amount = Number(amountStr.replace(/[^0-9]/g, ''))
    if (isNaN(amount) || amount <= 0) {
      throw new NormalError('Số tiền nhập vào không hợp lệ.')
    }

    // Filter only image files (Collection methods)
    const imageFiles = uploadedFiles?.filter((file) =>
      file.contentType?.startsWith('image/')
    )
    const nonImageFiles = uploadedFiles?.filter(
      (file) => !file.contentType?.startsWith('image/')
    )

    // Check if non-image files were uploaded
    if (nonImageFiles && nonImageFiles.size > 0) {
      throw new NormalError('Vui lòng chỉ tải lên các ảnh.')
    }

    const attachmentUrls = imageFiles?.map((file) => file.url) ?? []

    if (attachmentUrls.length === 0) {
      throw new NormalError(
        'Vui lòng tải lên ít nhất một ảnh minh chứng hợp lệ.'
      )
    }

    if (attachmentUrls.length > 10) {
      throw new NormalError('Tối đa chỉ được tải lên 10 ảnh.')
    }

    const messageUrl = await DonationHelper.sendDisbursementNotification({
      guildId: interaction.guild!.id,
      amount,
      description,
      attachmentUrls
    })

    if (!messageUrl) {
      throw new NormalError(
        'Không thể gửi thông báo khoản chi, vui lòng kiểm tra cài đặt.'
      )
    }

    await DisbursementRepository.create({
      guildId: interaction.guild!.id,
      amount,
      description,
      messageUrl
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Đã thêm khoản chi **${amount.toLocaleString('vi-VN')}đ** thành công!`
    )
  }
}
