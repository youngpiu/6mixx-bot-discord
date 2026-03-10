import { ButtonBuilder, ButtonStyle, ContainerBuilder } from 'discord.js'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'

export interface ListBuilderOptions<TState = unknown> {
  title: string
  emptyMessage?: string
  footer?: string
  idPrefix?: string
  encodeState?: (state: TState) => string
}

export class ListBuilder<TState = unknown> {
  private container: ContainerBuilder
  private items: string[] = []
  private actionRows: ButtonBuilder[][] = []
  private options: ListBuilderOptions<TState>

  constructor(options: ListBuilderOptions<TState>) {
    this.options = options
    this.container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`### ${this.options.title}`)
      )
      .addSeparatorComponents((sep) => sep)
  }

  // Adds a single text item to the list.
  // @param itemContent The formatted string content of the item.
  public addItem(itemContent: string): this {
    this.items.push(itemContent)
    return this
  }

  // Adds a row of buttons to the bottom of the container.
  // @param buttons An array of ButtonBuilder instances.
  public addActionRow(buttons: ButtonBuilder[]): this {
    if (buttons.length > 0) {
      this.actionRows.push(buttons)
    }
    return this
  }

  // Generates a standard pagination action row (First, Prev, Indicator, Next, Last).
  // @param state The state object that contains both pagination metadata and other custom filter states.
  //              It must include `page`, `totalPages`, `hasPrev`, and `hasNext`.
  // @param buttonFactory An optional callback to construct a ButtonBuilder if not using the default config.
  public addPaginationRow(
    state: TState & {
      page: number
      totalPages: number
      hasPrev: boolean
      hasNext: boolean
    },
    buttonFactory?: (
      action: string,
      state: TState,
      emoji: string | undefined,
      disabled: boolean,
      style?: ButtonStyle,
      label?: string
    ) => ButtonBuilder
  ): this {
    const defaultFactory = (
      action: string,
      state: TState,
      emoji: string | undefined,
      disabled: boolean,
      style = ButtonStyle.Secondary,
      label?: string
    ) => {
      const { idPrefix, encodeState } = this.options

      if (!idPrefix || !encodeState) {
        throw new Error('ListBuilder requires idPrefix and encodeState in options to generate pagination buttons internally.')
      }

      const customId = `${idPrefix}${action}:${encodeState(state)}`
      const button = new ButtonBuilder()
        .setCustomId(customId)
        .setStyle(style)
        .setDisabled(disabled)

      if (emoji) button.setEmoji(emoji)
      if (label) button.setLabel(label)

      return button
    }

    const factory = buttonFactory || defaultFactory

    const paginationButtons = [
      factory(
        'first',
        { ...state, page: 1 },
        STATIC_EMOJI.FIRST,
        !state.hasPrev,
        ButtonStyle.Secondary
      ),
      factory(
        'prev',
        { ...state, page: state.page - 1 },
        STATIC_EMOJI.PREVIOUS,
        !state.hasPrev,
        ButtonStyle.Secondary
      ),
      factory(
        'next',
        { ...state, page: state.page + 1 },
        STATIC_EMOJI.NEXT,
        !state.hasNext,
        ButtonStyle.Secondary
      ),
      factory(
        'last',
        { ...state, page: state.totalPages },
        STATIC_EMOJI.LAST,
        !state.hasNext,
        ButtonStyle.Secondary
      )
    ]

    return this.addActionRow(paginationButtons)
  }

  // Builds and returns the final container array for Discord responses.
  // @returns An array containing the constructed ContainerBuilder.
  public build(): [ContainerBuilder] {
    if (this.items.length === 0) {
      const fallbackMessage = this.options.emptyMessage || '_Không có dữ liệu._'
      this.container.addTextDisplayComponents((text) =>
        text.setContent(fallbackMessage)
      )
    } else {
      this.items.forEach((item) => {
        this.container.addTextDisplayComponents((text) => text.setContent(item))
      })
    }

    if (this.options.footer) {
      this.container
        .addSeparatorComponents((sep) => sep)
        .addTextDisplayComponents((text) =>
          text.setContent(`-# ${this.options.footer}`)
        )
    }

    this.actionRows.forEach((rowButtons) => {
      this.container.addActionRowComponents((row) =>
        row.addComponents(...rowButtons)
      )
    })

    return [this.container]
  }
}
