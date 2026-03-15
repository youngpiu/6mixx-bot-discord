import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command, container } from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder
} from 'discord.js'
import os from 'node:os'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('ping')
    .setDescription('Xem độ trễ và thông số kỹ thuật của bot')
)
@ApplyOptions<Command.Options>({
  name: 'ping',
  description: 'Xem độ trễ và thông số kỹ thuật của bot'
})
export class PingCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const heartbeat = container.client.ws.ping
    const botUptime = process.uptime()
    const systemUptime = os.uptime()

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    const formatBytes = (bytes: number) => {
      const gb = bytes / (1024 * 1024 * 1024)
      return `${gb.toFixed(2)} GB`
    }

    const formatUptime = (seconds: number) => {
      const days = Math.floor(seconds / (24 * 3600))
      const hours = Math.floor((seconds % (24 * 3600)) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${days}d ${hours}h ${minutes}m`
    }

    const cpuLoad = os.loadavg()[0].toFixed(2)
    const cpuModel = os.cpus()[0]?.model || 'Unknown CPU'

    const containerBuilder = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents((t) =>
        t.setContent(`${STATIC_EMOJI.SUCCESS} **Pong!**`)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents((s) =>
        s.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `📡 **Heartbeat:** \`${heartbeat}ms\``
          ),
          new TextDisplayBuilder().setContent(
            `📦 **RAM:** \`${formatBytes(usedMem)} / ${formatBytes(totalMem)}\``
          ),
          new TextDisplayBuilder().setContent(
            `💻 **CPU:** \`${cpuLoad}\` (${cpuModel})`
          ),
          new TextDisplayBuilder().setContent(
            `🕒 **Bot Uptime:** \`${formatUptime(botUptime)}\``
          ),
          new TextDisplayBuilder().setContent(
            `🖥️ **Sys Uptime:** \`${formatUptime(systemUptime)}\``
          )
        )
      )

    await InteractionUtil.replyWithContainer(interaction, containerBuilder)
  }
}
