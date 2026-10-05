import type { SessionStatus } from '../editor/editorSession'

/** Words are runs of letters and digits; Vietnamese counts each syllable, as a word processor does. */
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

/** Words and characters of a text; characters count code points and leave line breaks out. */
export function textStats(text: string): { words: number; characters: number } {
  let characters = 0
  for (const char of text) if (char !== '\n' && char !== '\r') characters++
  return { words: text.match(WORD)?.length ?? 0, characters }
}

/** One state for the chapter: unsaved if either side is, saving if either side is. */
export function combinedSaveLabel(statuses: SessionStatus[]): {
  label: string
  safe: boolean
} {
  if (statuses.some((status) => status.state === 'saving'))
    return { label: 'Đang lưu…', safe: false }
  if (statuses.some((status) => status.state === 'conflict' || status.state === 'error'))
    return { label: 'Lưu lỗi', safe: false }
  if (statuses.some((status) => status.dirty)) return { label: 'Chưa lưu', safe: false }
  return { label: 'Đã lưu', safe: true }
}
