import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, channelMention, inlineCode } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { formatFields } from '~/shared/utils/textUtil'

function normalizeXUsername(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const fromUrl = raw.match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})/i)
  const candidate = (fromUrl?.[1] || raw).replace(/^@/, '').trim()

  if (!/^[A-Za-z0-9_]{1,15}$/.test(candidate)) return null
  return candidate
}

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalBubbleModuleSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_BUBBLE_MODULE)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const bubbleIdolCategoryId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_BUBBLE_CATEGORY)
      ?.first()?.id

    const rawXUsername = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_SETTING_BUBBLE_X_USERNAME
    )

    const bubbleXUsername = normalizeXUsername(rawXUsername)

    if (!bubbleIdolCategoryId) {
      return InteractionUtil.replyError(
        interaction,
        'Bạn cần chọn danh mục chứa các kênh idol.'
      )
    }

    if (!bubbleXUsername) {
      return InteractionUtil.replyError(
        interaction,
        'Username X không hợp lệ. Ví dụ hợp lệ: `6mixxbbl` hoặc `@6mixxbbl`.'
      )
    }

    await SettingRepository.update(interaction.guild.id, {
      bubbleIdolCategoryId,
      bubbleXUsername
    })

    // Bubble source is global across all guilds.
    await SettingRepository.setBubbleUsernameGlobal(bubbleXUsername)

    const formattedFields = formatFields([
      ['Danh mục kênh idol', channelMention(bubbleIdolCategoryId)],
      ['Username Bubble (global)', inlineCode(`@${bubbleXUsername}`)]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật cài đặt Bubble thành công.',
      formattedFields
    )
  }
}
