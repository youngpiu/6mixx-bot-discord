import { ApplicationCommandRegistry, Command } from '@sapphire/framework'
import { ChatInputCommandInteraction, type Message } from 'discord.js'

export class PingCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'ping',
      description: 'Kiểm tra tốc độ phản hồi của bot.',
      preconditions: ['OwnerOnly']
    })
  }

  public override async messageRun(message: Message) {
    const { ping } = this.container.client.ws
    return message.reply({
      content: `Ping: ${ping}ms`
    })
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const { ping } = this.container.client.ws
    return interaction.reply({
      content: `Ping: ${ping}ms`
    })
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    )
  }
}
