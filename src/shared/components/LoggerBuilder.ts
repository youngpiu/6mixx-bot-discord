import { ContainerBuilder } from 'discord.js'

import { formatFields, lines } from '~/shared/utils/textUtil'

export interface LoggerBuilderOptions {
  title: string
  color?: number
}

export class LoggerBuilder {
  private container: ContainerBuilder
  private fields: [string, string | null | undefined][] = []

  constructor(options: LoggerBuilderOptions) {
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
   * Builds and returns the container
   */
  public build(): [ContainerBuilder] {
    if (this.fields.length > 0) {
      this.container.addTextDisplayComponents((t) =>
        t.setContent(lines(...formatFields(this.fields, '- ')))
      )
    }

    return [this.container]
  }

  /**
   * Returns the underlying ContainerBuilder for further manual manipulation if necessary
   */
  public getContainer(): ContainerBuilder {
    return this.container
  }
}
