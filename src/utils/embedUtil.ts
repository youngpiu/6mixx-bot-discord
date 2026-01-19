import { EmbedBuilder } from 'discord.js'
import { RGB_COLOR_TEMPLATE } from '~/constants/colorConstant'

type EmbedOptions = {
  title?: string
  description: string
}

export const createErrorEmbed = ({ title, description }: EmbedOptions) => {
  return new EmbedBuilder()
    .setColor(RGB_COLOR_TEMPLATE.ERROR)
    .setTitle(title ?? null)
    .setDescription(description)
}

export const createSuccessEmbed = ({ title = 'Yêu cầu thành công', description }: EmbedOptions) => {
  return new EmbedBuilder()
    .setColor(RGB_COLOR_TEMPLATE.SUCCESS)
    .setTitle(title ?? null)
    .setDescription(description)
}
