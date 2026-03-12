import { ButtonBuilder, ContainerBuilder } from 'discord.js'

import { formatFields, lines } from '~/shared/utils/textUtil'

/**
 * Options for configuring a DetailBuilder instance.
 */
export interface DetailBuilderOptions {
  /** The title text displayed at the top of the detail view. */
  title: string
  /** The optional color code (accent color) for the content. */
  color?: number
}

/**
 * A utility class for building standardized detail view containers using Sapphire's ContainerBuilder.
 * Automatically handles title, formatting key-value fields, extra content, and action rows.
 */
export class DetailBuilder {
  private container: ContainerBuilder
  private fields: [string, string | null | undefined][] = []
  private actionRows: ButtonBuilder[][] = []
  private extraContents: string[] = []

  /**
   * Initializes a new DetailBuilder with a title and optional accent color.
   *
   * @param options - Configuration options for the detail view.
   */
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
   * Adds extra unformatted raw content blocks (like multi-line strings).
   *
   * @param content - The raw string content to add.
   * @returns The builder instance for chaining.
   */
  public addContent(content: string): this {
    this.extraContents.push(content)
    return this
  }

  /**
   * Adds a row of action components (buttons) to the detail view.
   *
   * @param buttons - An array of ButtonBuilder instances.
   * @returns The builder instance for chaining.
   */
  public addActionRow(buttons: ButtonBuilder[]): this {
    if (buttons.length > 0) {
      this.actionRows.push(buttons)
    }
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

    this.extraContents.forEach((content) => {
      this.container.addTextDisplayComponents((t) => t.setContent(content))
    })

    this.actionRows.forEach((rowButtons) => {
      this.container
        .addSeparatorComponents((s) => s)
        .addActionRowComponents((row) => row.addComponents(...rowButtons))
    })

    return [this.container]
  }
}
