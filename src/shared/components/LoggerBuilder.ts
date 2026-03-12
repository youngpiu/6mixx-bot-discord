import { ContainerBuilder } from 'discord.js'

import { formatFields, lines } from '~/shared/utils/textUtil'

/**
 * Options for configuring a LoggerBuilder instance.
 */
export interface LoggerBuilderOptions {
  /** The title of the log entry. */
  title: string
  /** The optional color code (accent color) for the log entry. */
  color?: number
}

/**
 * A utility class for building standardized log/report containers using Sapphire's ContainerBuilder.
 * Ideal for system logs, command execution reports, and administrative notifications.
 */
export class LoggerBuilder {
  private container: ContainerBuilder
  private fields: [string, string | null | undefined][] = []

  /**
   * Initializes a new LoggerBuilder with a title and optional accent color.
   *
   * @param options - Configuration options for the log builder.
   */
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
   * Adds an array of key-value pairs that will be formatted and aligned using `formatFields`.
   *
   * @param fields - Array of [key, value] tuples.
   * @returns The builder instance for chaining.
   */
  public addFields(fields: [string, string | null | undefined][]): this {
    this.fields.push(...fields)
    return this
  }

  /**
   * Finalizes the configuration and returns the constructed ContainerBuilder in an array.
   *
   * @returns A [ContainerBuilder] tuple.
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
   * Returns the underlying ContainerBuilder instance for manual manipulation.
   *
   * @returns The current ContainerBuilder instance.
   */
  public getContainer(): ContainerBuilder {
    return this.container
  }
}
