import type { ChatContextBlock, ChatSendInput } from '../../../shared/contracts/aiChat'
import type { ContextEntryItem } from '../../../shared/contracts/glossary'
import type { AddressingDyadResolved } from '../../../shared/contracts/addressing'
import type { SourceLanguage } from '../../../shared/contracts/library'
import { matchContextEntries } from '../../../shared/algorithms/contextMatching'
import {
  addressingLines,
  approvedDyads,
  approvedGlossary,
  dyadsMentionedIn,
  glossaryLines
} from './translate/translatePrompt'

/** Phần kho mà chat cần để tự lấy glossary và xưng hô của truyện. */
export interface ChatStoreLibrary {
  get(workId: string): { sourceLang: SourceLanguage }
  readText(workId: string, chapterId: string, side: 'source'): { content: string }
  getEffectiveGlossary(
    workId: string,
    chapterId: string,
    options?: { approvedOnly?: boolean }
  ): ContextEntryItem[]
  getEffectiveAddressing(workId: string, chapterId: string): AddressingDyadResolved[]
}

/**
 * Các khối thuật ngữ và xưng hô **main tự đọc từ kho** của tác phẩm cho một lượt chat.
 *
 * Renderer chỉ thấy chữ trong editor; glossary và ma trận xưng hô nằm trong `.mira`. Thiếu hai khối
 * này thì chế độ Sửa có thể đề xuất trái chính thuật ngữ mà Dịch đang ép. Chỉ gửi mục **đã duyệt**
 * và **khớp với chương**, cùng luật với lô dịch: so trên bản gốc của chương (bản trong editor nếu
 * renderer gửi kèm, vì có thể chưa lưu; không có thì bản đã lưu).
 *
 * Đọc kho lỗi thì trả rỗng: thiếu thuật ngữ là chat kém đi, không phải lý do chặn cả câu hỏi.
 */
export function chatStoreContext(
  library: ChatStoreLibrary,
  input: ChatSendInput
): ChatContextBlock[] {
  try {
    const { sourceLang } = library.get(input.workId)
    const sent = input.context.find((block) => block.kind === 'chapter-source')
    const source = sent?.text ?? library.readText(input.workId, input.chapterId, 'source').content
    if (source.trim() === '') return []

    const blocks: ChatContextBlock[] = []
    const glossary = library.getEffectiveGlossary(input.workId, input.chapterId, {
      approvedOnly: true
    })
    const terms = approvedGlossary(matchContextEntries(source, glossary, sourceLang))
    if (terms.length > 0) {
      blocks.push({
        kind: 'term',
        label: 'Thuật ngữ đã duyệt',
        detail: terms.length + ' mục khớp chương',
        text: glossaryLines(terms).join('\n')
      })
    }

    const dyads = dyadsMentionedIn(
      approvedDyads(library.getEffectiveAddressing(input.workId, input.chapterId)),
      source
    )
    if (dyads.length > 0) {
      blocks.push({
        kind: 'dyad',
        label: 'Xưng hô đã duyệt',
        detail: dyads.length + ' cặp có mặt trong chương',
        text: addressingLines(dyads).join('\n')
      })
    }
    return blocks
  } catch {
    return []
  }
}
