import { CHAT_BLOCK_TEXT_MAX, type ChatContextBlock } from '../../../../shared/contracts/aiChat'
import type { TargetRange } from '../editor/chatRange'

/**
 * What gets sent along with a question, chosen by rule.
 *
 * Built in the renderer, from the text **open in the editors** — not from storage. That is the whole
 * point: the main process can only see what was saved, so a translator who just rewrote three
 * sentences and is now asking about them would get an answer about text that no longer exists. A
 * silent wrong answer is worse than a slow one, so the live buffer wins.
 *
 * Pure and deterministic: same chapter, same range, same blocks. Without that, "here is what I sent"
 * is a guess, and a turn could never be reproduced (D6 of change `ai-chat`).
 *
 * **The chapter's source always goes.** An earlier version sent it only when the two sides had the
 * same number of paragraphs, so it could be matched paragraph to paragraph — which meant an
 * untranslated chapter sent no source at all, and "dịch chương này" reached the model with nothing
 * to translate. The alignment rule is still used for the *extra* per-paragraph block, but it is no
 * longer allowed to decide whether the model sees the chapter.
 */

/** Asking about the chapter, or about one stretch inside it. */
export type ContextScope = 'chapter' | 'range'

export interface ChatContextInput {
  /** The source text as it stands in its pane right now. */
  sourceText: string
  /** The translation as it stands in its pane right now; `range` indexes into this. */
  targetText: string
  /** The narrower stretch being asked about; ignored when the scope is the chapter. */
  range: TargetRange | null
  scope: ContextScope
  /** How many paragraphs either side of the range to send. */
  radius: number
}

export interface Paragraph {
  from: number
  to: number
  text: string
}

/** Paragraphs of a text: runs of non-blank lines, with their offsets. Blank runs are separators. */
export function paragraphsOf(text: string): Paragraph[] {
  const found: Paragraph[] = []
  let start: number | null = null
  let at = 0

  for (const line of text.split('\n')) {
    const blank = line.trim() === ''
    if (blank) {
      if (start !== null) {
        found.push({ from: start, to: at - 1, text: text.slice(start, at - 1) })
        start = null
      }
    } else if (start === null) {
      start = at
    }
    at += line.length + 1
  }
  if (start !== null) found.push({ from: start, to: text.length, text: text.slice(start) })
  return found
}

/** Index of the paragraph the offset sits in, or the nearest one before it; -1 when there are none. */
function paragraphIndexAt(paragraphs: Paragraph[], offset: number): number {
  let best = -1
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].from <= offset) best = i
    else break
  }
  return best
}

const plural = (count: number, word: string): string => count + ' ' + word

/**
 * Cuts a long text to what one block may carry, and **says so in the detail line**.
 *
 * Never silent: a model answering from half a chapter while the panel claims the chapter was sent is
 * exactly the kind of wrong that is impossible to notice from the answer alone.
 */
function capped(text: string): { text: string; note: string } {
  if (text.length <= CHAT_BLOCK_TEXT_MAX) return { text, note: '' }
  return {
    text: text.slice(0, CHAT_BLOCK_TEXT_MAX),
    note: ', đã cắt còn ' + CHAT_BLOCK_TEXT_MAX.toLocaleString('vi') + ' ký tự đầu'
  }
}

function chapterBlocks(sourceText: string, targetText: string): ChatContextBlock[] {
  const blocks: ChatContextBlock[] = []

  if (sourceText.trim() !== '') {
    const source = capped(sourceText)
    blocks.push({
      kind: 'chapter-source',
      label: 'Bản gốc của chương',
      detail: plural(sourceText.length, 'ký tự') + source.note,
      text: source.text
    })
  }

  if (targetText.trim() !== '') {
    const target = capped(targetText)
    blocks.push({
      kind: 'chapter-target',
      label: 'Bản dịch hiện có',
      detail: plural(targetText.length, 'ký tự') + target.note,
      text: target.text
    })
  }

  return blocks
}

/**
 * The blocks to send, in a fixed order: the chapter first, then the stretch being asked about.
 *
 * The chapter's source leads because it is what every question about a translation ultimately refers
 * back to. The per-paragraph blocks after it are a **narrowing**, not a replacement: they tell the
 * model where to look, they are not the only thing it may look at.
 *
 * The source counterpart of a paragraph is still matched **by paragraph index**, and still only when
 * both sides have the same number of paragraphs. That rule stays deliberately dumb — real alignment
 * is change `segment-auto-align` and does not exist yet — but now it only adds a convenience block;
 * when it does not fire, the model still has the whole source above it.
 */
export function buildChatContext(input: ChatContextInput): ChatContextBlock[] {
  const { sourceText, targetText, range, scope, radius } = input
  const blocks = chapterBlocks(sourceText, targetText)
  if (scope === 'chapter' || range === null || range.text.trim() === '') return blocks

  blocks.push({
    kind: 'range',
    label: 'Đoạn đang sửa',
    detail: plural(range.text.length, 'ký tự') + ' trong bản dịch',
    text: range.text
  })

  const target = paragraphsOf(targetText)
  const source = paragraphsOf(sourceText)
  const index = paragraphIndexAt(target, range.from)

  if (index !== -1 && source.length === target.length) {
    blocks.push({
      kind: 'range',
      label: 'Bản gốc của đoạn',
      detail: 'đoạn thứ ' + (index + 1) + ' của bản gốc',
      text: source[index].text
    })
  }

  if (index !== -1 && radius > 0) {
    const before = target.slice(Math.max(0, index - radius), index)
    if (before.length > 0) {
      blocks.push({
        kind: 'before',
        label: 'Bản dịch liền trước',
        detail: plural(before.length, 'đoạn'),
        text: before.map((paragraph) => paragraph.text).join('\n\n')
      })
    }

    const after = target.slice(index + 1, index + 1 + radius)
    if (after.length > 0) {
      blocks.push({
        kind: 'after',
        label: 'Bản dịch liền sau',
        detail: plural(after.length, 'đoạn'),
        text: after.map((paragraph) => paragraph.text).join('\n\n')
      })
    }
  }

  return blocks
}

/**
 * What the panel header says a turn is about.
 *
 * Never silently means "the whole chapter": when the caret is on a blank line there is nothing to ask
 * about, and saying so is more use than quietly widening the range (D8/Q8).
 */
export function rangeLabel(
  range: TargetRange | null,
  targetText: string,
  scope: ContextScope = 'range'
): string {
  if (scope === 'chapter') return 'cả chương'
  if (range === null || range.text.trim() === '') return 'chưa đặt con trỏ vào đoạn nào'
  if (range.from === 0 && range.to >= targetText.length) return 'cả chương'
  const selected = range.to - range.from
  const paragraphs = paragraphsOf(range.text).length
  if (paragraphs > 1) return plural(paragraphs, 'đoạn') + ' · ' + plural(selected, 'ký tự')
  return 'đoạn đang sửa · ' + plural(selected, 'ký tự')
}
