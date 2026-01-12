import {
  Events,
  Listener,
  type MessageCommandDeniedPayload,
  type UserError
} from '@sapphire/framework'

export class MessageCommandDenied extends Listener<
  typeof Events.MessageCommandDenied
> {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCommandDenied
    })
  }

  public run(error: UserError, { message }: MessageCommandDeniedPayload) {
    if (message.channel.isDMBased()) return
    return message.reply(error.message)
  }
}
