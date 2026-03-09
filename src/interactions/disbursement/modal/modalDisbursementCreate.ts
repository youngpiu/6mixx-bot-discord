import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { Attachment, MediaGalleryBuilder, ModalSubmitInteraction } from 'discord.js'
import { LoggerBuilder } from '~/components/LoggerBuilder'

import { CUSTOM_ID } from '~/constants/idConstant'

import { InteractionUtil, MessageUtil } from '~/utils/messageUtil'

import { DisbursementRepository } from '~/repositories/disbursementRepository'
import { GuildRepository } from '~/repositories/guildRepository'
import { MemberRepository } from '~/repositories/memberRepository'

export class ModalDisbursementCreateHandler extends InteractionHandler {
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
    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction || !interaction.guild || !interaction.member) return

    const amountStr = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_DISBURSEMENT_AMOUNT)
    const amount = Number(amountStr.replace(/\D/g, ''))

    if (isNaN(amount) || amount <= 0) {
      return InteractionUtil.replyError(
        interaction,
        'Số tiền không hợp lệ. Vui lòng nhập bằng số dương.'
      )
    }

    if (amount > 2_000_000_000) {
      return InteractionUtil.replyError(
        interaction,
        'Số tiền quá lớn. Vui lòng nhập số tiền dưới 2 tỷ VNĐ.'
      )
    }

    const description = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_DISBURSEMENT_DESCRIPTION
    )

    const uploadedFiles = interaction.fields.getUploadedFiles(CUSTOM_ID.UPLOAD_DISBURSEMENT_IMAGES)

    const filesArray: Attachment[] = Array.isArray(uploadedFiles)
      ? uploadedFiles
      : Array.from((uploadedFiles?.values ? uploadedFiles.values() : []) as Iterable<Attachment>)

    const attachmentUrls = filesArray.map((f: Attachment) => f.url).filter(Boolean)

    if (attachmentUrls.length === 0) {
      return InteractionUtil.replyError(
        interaction,
        'Vui lòng đính kèm ít nhất 1 ảnh minh chứng hợp lệ.'
      )
    }

    const guildConfig = await GuildRepository.getDonationConfig(interaction.guild.id)
    const threadId = guildConfig?.donationTutorialThreadId

    if (!threadId) {
      return InteractionUtil.replyError(
        interaction,
        'Cổng quyên góp chưa được thiết lập. Vui lòng liên hệ Admin.'
      )
    }

    const thread = await interaction.guild?.channels.fetch(threadId).catch(() => null)
    if (!thread || !thread.isTextBased()) {
      return InteractionUtil.replyError(
        interaction,
        'Không tìm thấy kênh dịch vụ quyên góp. Vui lòng thiết lập lại Cổng dịch vụ.'
      )
    }

    const logger = new LoggerBuilder({ title: '💸 THÔNG BÁO GIẢI NGÂN MỚI 💸' }).addFields([
      ['Số tiền', `**${amount.toLocaleString('vi-VN')}đ**`],
      ['Mô tả', `**${description}**`],
      ['Người lập phiếu', `<@${interaction.user.id}>`],
      ['Thời gian', `<t:${Math.floor(Date.now() / 1000)}:f>`]
    ])

    const container = logger.getContainer()

    const gallery = new MediaGalleryBuilder()
    for (const url of attachmentUrls) {
      gallery.addItems((item) => item.setURL(url as string))
    }

    container.addMediaGalleryComponents(gallery)

    // Ensure IsComponentsV2 sends correctly using MessageUtil
    const sentMessage = await MessageUtil.sendWithContainer(thread, container)

    if (!sentMessage) {
      return InteractionUtil.replyError(
        interaction,
        'Có lỗi xảy ra khi gửi báo cáo giải ngân vào hệ thống diễn đàn.'
      )
    }

    await MemberRepository.createMember({
      guildId: interaction.guild.id,
      userId: interaction.user.id
    })

    await DisbursementRepository.createDisbursement({
      guildId: interaction.guild.id,
      amount,
      description,
      attachmentUrls,
      messageUrl: sentMessage.url
    })

    await InteractionUtil.replySuccess(
      interaction,
      `Đã thêm khoản chi thành công và thông báo vào Thread quyên góp: <#${thread.id}>.`
    )
  }
}
