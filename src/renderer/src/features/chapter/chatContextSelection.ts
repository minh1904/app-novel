import { CHAT_BLOCK_TEXT_MAX, type ChatContextBlock } from '../../../../shared/contracts/aiChat'

export interface AddedChapterContext {
  key: string
  block: ChatContextBlock
  length: number
  truncated: boolean
}

/** Snapshot the chosen chapter side once; the preview and request share this exact block. */
export function addedChapterContext(
  chapter: { id: string; title: string; number: number },
  side: 'source' | 'target',
  content: string
): AddedChapterContext {
  const length = content.length
  const truncated = length > CHAT_BLOCK_TEXT_MAX
  return {
    key: chapter.id + ':' + side,
    length,
    truncated,
    block: {
      kind: side === 'source' ? 'chapter-source' : 'chapter-target',
      label: (side === 'source' ? 'Bản gốc' : 'Bản dịch') + ' · ' +
        (chapter.title.trim() || 'Chương ' + chapter.number),
      detail: length.toLocaleString('vi') + ' ký tự' +
        (truncated ? ', đã cắt còn ' + CHAT_BLOCK_TEXT_MAX.toLocaleString('vi') + ' ký tự đầu' : ''),
      text: content.slice(0, CHAT_BLOCK_TEXT_MAX)
    }
  }
}
