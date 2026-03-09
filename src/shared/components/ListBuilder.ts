import { ButtonBuilder, ButtonStyle, ContainerBuilder } from 'discord.js'
import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'

export interface ListBuilderOptions {
  title: string
  emptyMessage?: string
  footer?: string
}

export class ListBuilder {
  private container: ContainerBuilder
  private items: string[] = []
  private actionRows: ButtonBuilder[][] = []
  private options: ListBuilderOptions

  constructor(options: ListBuilderOptions) {
    this.options = options
    this.container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`### ${this.options.title}`)
      )
      .addSeparatorComponents((sep) => sep)
  }

  /**
   * Adds a single text item to the list.
   * @param itemContent The formatted string content of the item.
   */
  public addItem(itemContent: string): this {
    this.items.push(itemContent)
    return this
  }

  /**
   * Adds a row of buttons to the bottom of the container.
   * @param buttons An array of ButtonBuilder instances.
   */
  public addActionRow(buttons: ButtonBuilder[]): this {
    if (buttons.length > 0) {
      this.actionRows.push(buttons)
    }
    return this
  }

  /**
   * Generates a standard pagination action row (First, Prev, Indicator, Next, Last).
   * @param state The state object that contains both pagination metadata and other custom filter states.
   *              It must include `page`, `totalPages`, `hasPrev`, and `hasNext`.
   * @param buttonFactory A callback to construct a ButtonBuilder given the action, new state, emoji, disable status, style, and label.
   */
  public addPaginationRow<
    TState extends {
      page: number
      totalPages: number
      hasPrev: boolean
      hasNext: boolean
    }
  >(
    state: TState,
    buttonFactory: (
      action: string,
      state: TState,
      emoji: string | undefined,
      disabled: boolean,
      style?: ButtonStyle,
      label?: string
    ) => ButtonBuilder
  ): this {
    const paginationButtons = [
      buttonFactory(
        'first',
        { ...state, page: 1 },
        STATIC_EMOJI.FIRST,
        !state.hasPrev,
        ButtonStyle.Secondary
      ),
      buttonFactory(
        'prev',
        { ...state, page: state.page - 1 },
        STATIC_EMOJI.PREVIOUS,
        !state.hasPrev,
        ButtonStyle.Secondary
      ),
      buttonFactory(
        'next',
        { ...state, page: state.page + 1 },
        STATIC_EMOJI.NEXT,
        !state.hasNext,
        ButtonStyle.Secondary
      ),
      buttonFactory(
        'last',
        { ...state, page: state.totalPages },
        STATIC_EMOJI.LAST,
        !state.hasNext,
        ButtonStyle.Secondary
      )
    ]

    return this.addActionRow(paginationButtons)
  }

  /**
   * Builds and returns the final container array for Discord responses.
   * @returns An array containing the constructed ContainerBuilder.
   */
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
