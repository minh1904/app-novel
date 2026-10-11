/**
 * DeltaBuffer batches streaming text deltas (tokens) across 30-50ms windows
 * to avoid excessive React re-renders while keeping Markdown parsing stable (Task 6.5).
 */
export class DeltaBuffer {
  private buffer = ''
  private committedText = ''
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly intervalMs: number
  private readonly onCommit: (text: string) => void

  constructor(options: {
    intervalMs?: number
    onCommit: (text: string) => void
    initialText?: string
  }) {
    this.intervalMs = options.intervalMs ?? 40
    this.onCommit = options.onCommit
    this.committedText = options.initialText ?? ''
  }

  /** Appends a new incoming delta from the stream */
  append(delta: string): void {
    if (!delta) return
    this.buffer += delta

    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush()
      }, this.intervalMs)
    }
  }

  /** Flushes any buffered content immediately */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.buffer.length > 0) {
      this.committedText += this.buffer
      this.buffer = ''
      this.onCommit(this.committedText)
    }
  }

  /** Clears the buffer and resets */
  reset(text = ''): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.buffer = ''
    this.committedText = text
  }

  /** Current full text including buffered delta */
  get current(): string {
    return this.committedText + this.buffer
  }

  /** Total committed text so far */
  get committed(): string {
    return this.committedText
  }

  /**
   * Closes unclosed Markdown code fences in streaming text for safe preview rendering.
   */
  static safeTailFence(text: string): string {
    const codeBlockCount = (text.match(/```/g) || []).length
    // If odd number of triple backticks, a code fence is unclosed
    if (codeBlockCount % 2 !== 0) {
      return `${text}\n\`\`\``
    }
    return text
  }
}
