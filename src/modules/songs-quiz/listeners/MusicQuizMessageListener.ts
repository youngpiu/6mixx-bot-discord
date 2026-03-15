import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Message } from 'discord.js'

import { MessageUtil } from '~/shared/utils/messageUtil'

import { MusicQuizRedisService } from '../services/MusicQuizRedisService'
import { MusicQuizService } from '../services/MusicQuizService'

@ApplyOptions<Listener.Options>({
  event: 'messageCreate'
})
export class MusicQuizMessageListener extends Listener {
  public async run(message: Message) {
    if (message.author.bot || !message.guild) return

    const state = await MusicQuizRedisService.getState(message.guild.id)
    if (!state || message.channel.id !== state.textChannelId) return

    const isCorrect = await MusicQuizService.handleGuess(
      message.guild.id,
      message.content,
      message.author.id
    )

    if (!isCorrect) {
      await MessageUtil.replyError(
        message,
        'Đoán sai rồi bạng êi!',
        5000,
        'NORMAL',
        false
      )
    } else {
      // Delete the correct guess message to keep channel clean?
      // Or let it stay. The service already sends a success embed.
      await message.delete().catch(() => null)
    }
  }
}
