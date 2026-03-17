import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Message } from 'discord.js'

import { TIME } from '~/shared/constants/timeConstant'
import { MessageUtil } from '~/shared/utils/messageUtil'

import { MusicQuizRedisService } from '~/modules/songs-quiz/services/MusicQuizRedisService'
import { MusicQuizService } from '~/modules/songs-quiz/services/MusicQuizService'

@ApplyOptions<Listener.Options>({
  event: 'messageCreate'
})
export class MusicQuizMessageListener extends Listener {
  public async run(message: Message) {
    if (message.author.bot || !message.guild) return

    const state = await MusicQuizRedisService.getState(message.guild.id)
    if (!state || message.channel.id !== state.textChannelId) return

    // Auto-delete messages sent when music is NOT playing (during loading or between rounds)
    if (!state.isPlaying) {
      if (message.deletable) {
        await message.delete().catch(() => {})
      }
      return
    }

    const isCorrect = await MusicQuizService.handleGuess(
      message.guild.id,
      message.content,
      message.author.id,
      message
    )

    if (isCorrect === false) {
      await MessageUtil.reply(
        message,
        {
          content: 'Đoán sai rồi bạn êi...'
        },
        TIME.S3,
        true
      )
    }
  }
}
