import { describe, expect, it } from 'vitest'
import type { ChatSendInput } from '../../../shared/contracts/aiChat'
import type { ContextEntryItem } from '../../../shared/contracts/glossary'
import type { AddressingDyadResolved, CharacterItem } from '../../../shared/contracts/addressing'
import { chatStoreContext, type ChatStoreLibrary } from './chatStoreContext'

function term(over: Partial<ContextEntryItem>): ContextEntryItem {
  return {
    id: 't',
    kind: 'term',
    source: '韩立',
    target: 'Hàn Lập',
    status: 'approved',
    origin: 'user',
    forbidden: false,
    fromChapterId: null,
    toChapterId: null,
    notes: null,
    aliases: [],
    createdAt: 1,
    updatedAt: 1,
    ...over
  }
}

function character(over: Partial<CharacterItem>): CharacterItem {
  return {
    id: 'c',
    source: '韩立',
    target: 'Hàn Lập',
    gender: 'male',
    role: null,
    status: 'approved',
    notes: null,
    aliases: [],
    createdAt: 1,
    updatedAt: 1,
    ...over
  }
}

function dyad(from: CharacterItem, to: CharacterItem): AddressingDyadResolved {
  return {
    id: from.id + to.id,
    sourceCharacterId: from.id,
    targetCharacterId: to.id,
    speakerPronoun: 'ta',
    recipientPronoun: 'nàng',
    formality: null,
    status: 'approved',
    fromChapterId: null,
    toChapterId: null,
    notes: null,
    createdAt: 1,
    updatedAt: 1,
    sourceCharacter: from,
    targetCharacter: to
  }
}

const han = character({ id: 'c1' })
const nam = character({ id: 'c2', source: '南宫婉', target: 'Nam Cung Uyển' })
const lu = character({ id: 'c3', source: '陆', target: 'Lục' })

function library(saved: string, over: Partial<ChatStoreLibrary> = {}): ChatStoreLibrary {
  return {
    get: () => ({ sourceLang: 'zh-Hans' }),
    readText: () => ({ content: saved }),
    getEffectiveGlossary: () => [
      term({}),
      term({ id: 't2', source: '筑基', target: 'Trúc Cơ' }),
      term({ id: 't3', source: '脏话', target: 'Từ Cấm', forbidden: true })
    ],
    getEffectiveAddressing: () => [dyad(han, nam), dyad(han, lu)],
    ...over
  }
}

function input(patch: Partial<ChatSendInput> = {}): ChatSendInput {
  return {
    workId: 'w',
    chapterId: 'ch',
    connectionId: 'c',
    entryId: 'e',
    mode: 'edit',
    sourceLang: 'zh-Hans',
    question: 'Sửa đoạn này',
    history: [],
    context: [],
    ...patch
  }
}

describe('chatStoreContext', () => {
  it('chỉ gửi thuật ngữ và cặp xưng hô khớp với bản gốc của chương', () => {
    const blocks = chatStoreContext(library('韩立看着南宫婉，说了脏话。'), input())
    expect(blocks.map((block) => block.kind)).toEqual(['term', 'dyad'])
    expect(blocks[0].text).toContain('- 韩立 → Hàn Lập')
    expect(blocks[0].text).toContain('Forbidden:\n- "Từ Cấm" (for source term 脏话)')
    expect(blocks[0].text).not.toContain('Trúc Cơ')
    expect(blocks[0].detail).toBe('2 mục khớp chương')
    expect(blocks[1].text).toBe(
      '- Hàn Lập → Nam Cung Uyển: Hàn Lập tự xưng "ta", gọi Nam Cung Uyển là "nàng".'
    )
  })

  it('ưu tiên bản gốc renderer gửi kèm vì có thể chưa lưu', () => {
    const own = {
      kind: 'chapter-source' as const,
      label: 'Bản gốc của chương',
      detail: '',
      text: '筑基'
    }
    const blocks = chatStoreContext(library('韩立'), input({ context: [own] }))
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toContain('Trúc Cơ')
  })

  it('không chặn câu hỏi khi đọc kho lỗi hoặc chương trống', () => {
    const broken = library('韩立', {
      getEffectiveGlossary: () => {
        throw new Error('db')
      }
    })
    expect(chatStoreContext(broken, input())).toEqual([])
    expect(chatStoreContext(library('  '), input())).toEqual([])
  })
})
