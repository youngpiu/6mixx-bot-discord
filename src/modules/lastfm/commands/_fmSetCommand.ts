import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  SectionBuilder
} from 'discord.js'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmService } from '~/modules/lastfm/services/lastFmService'

export class LastFmSetCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username = interaction.options.getString('username', true)
    const userId = interaction.user.id

    const account = await LastFmService.setAccount(userId, username)

    const container = new ContainerBuilder().addSectionComponents(
      (s: SectionBuilder) =>
        s
          .addTextDisplayComponents(
            (t) =>
              t.setContent(`### ${STATIC_EMOJI.SUCCESS} Liên kết thành công!`),
            (t) =>
              t.setContent(
                `Tài khoản Discord của bạn đã được liên kết với Last.fm: **[${account.lastfmUsername}](https://www.last.fm/user/${account.lastfmUsername})**`
              )
          )
          .setThumbnailAccessory((thumb) =>
            thumb.setURL(interaction.user.displayAvatarURL())
          )
    )

    return InteractionUtil.replyWithContainer(interaction, container, false)
  }
}
