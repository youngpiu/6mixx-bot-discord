import { ButtonBuilder, ContainerBuilder } from 'discord.js'

import { formatFields, lines } from '~/shared/utils/textUtil'

export interface DetailBuilderOptions {
  title: string
  color?: number
}

export class DetailBuilder {
  private container: ContainerBuilder
  private fields: [string, string | null | undefined][] = []
  private actionRows: ButtonBuilder[][] = []
  private extraContents: string[] = []

  constructor(options: DetailBuilderOptions) {
    this.container = new ContainerBuilder()
    if (options.color) {
      this.container.setAccentColor(options.color)
    }
    this.container.addTextDisplayComponents((t) =>
      t.setContent(`### ${options.title}`)
    )
    this.container.addSeparatorComponents((s) => s)
  }

  /**
   * Adds an array of key-value pairs that will be formatted and aligned
   */
  public addFields(fields: [string, string | null | undefined][]): this {
    this.fields.push(...fields)
    return this
  }

  /**
   * Adds extra unformatted raw content blocks (like multi-line strings)
   */
  public addContent(content: string): this {
    this.extraContents.push(content)
    return this
  }

  /**
   * Adds a row of buttons
   */
  public addActionRow(buttons: ButtonBuilder[]): this {
    if (buttons.length > 0) {
      this.actionRows.push(buttons)
    }
    return this
  }

  /**
   * Builds and returns the container
   */
  public build(): [ContainerBuilder] {
    if (this.fields.length > 0) {
      this.container.addTextDisplayComponents((t) =>
        t.setContent(lines(...formatFields(this.fields, '- ')))
      )
    }

    this.extraContents.forEach((content) => {
      this.container.addTextDisplayComponents((t) => t.setContent(content))
    })

    this.actionRows.forEach((rowButtons) => {
      this.container.addActionRowComponents((row) =>
        row.addComponents(...rowButtons)
      )
    })

    return [this.container]
  }
}
