import { EmbedBuilder } from 'discord.js'
import { RGB_COLOR_TEMPLATE } from '~/constants/colorConstant'

export const createErrorEmbed = (title: string, description: string) => {
  return new EmbedBuilder()
    .setColor(RGB_COLOR_TEMPLATE.ERROR)
    .setTitle(title)
    .setDescription(description)
}
