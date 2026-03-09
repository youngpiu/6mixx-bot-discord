import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { ChatInputCommandInteraction } from 'discord.js'

import { SelectSettingNav } from '~/interactions/setting/selectMenu/selectSettingNav'
import { InteractionUtil } from '~/utils/messageUtil'

@RegisterChatInputCommand((builder) =>
  builder.setName('setting').setDescription('[OWNER] Cài đặt máy chủ VNMIXX')
)
@ApplyOptions<Command.Options>({
  name: 'setting',
  description: '[OWNER] Cài đặt máy chủ VNMIXX',
  preconditions: ['OwnerOnly'],
})
export class SettingCommand extends Command {

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const container = SelectSettingNav.createGeneralSettings()

    await InteractionUtil.editReply(interaction, {
      components: [container],
      flags: ['IsComponentsV2']
    })
  }
}
