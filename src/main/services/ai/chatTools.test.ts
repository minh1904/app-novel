import { describe, expect, it } from 'vitest'
import type { ChapterItem } from '../../../shared/contracts/chapters'
import type { TextRecord, TextSide } from '../../../shared/contracts/text'
import {
  CHAT_TOOL_DEFINITIONS,
  createChatTools,
  TOOL_TEXT_MAX,
  type ChatToolLibrary
} from './chatTools'

/**
 * What the model may look up for itself.
 *
 * The test that matters most is the scoping one: `workId` is bound when the tools are built and is
 * not a parameter, so reaching into another work is not something the model can even ask for. The
 * rest check that a wrong answer comes back as text the model can recover from, rather than as an
 * exception that kills the turn.
 */

const WORK = 'work-1'
const OTHER = 'work-2'

function chapter(number: number, patch: Partial<ChapterItem> = {}): ChapterItem {
  return {
    id: 'ch-' + number,
    number,
    title: 'Chương ' + number,
    createdAt: 0,
    updatedAt: 0,
    hasSource: true,
    hasTarget: false,
    ...patch
  }
}

function libraryOf(texts: Record<string, string> = {}): ChatToolLibrary & { reads: string[] } {
  const reads: string[] = []
  return {
    reads,
    listChapters(workId) {
      if (workId !== WORK) return []
      return [chapter(1), chapter(2, { hasTarget: true })]
    },
    readText(workId: string, chapterId: string, side: TextSide): TextRecord {
      reads.push(workId + '/' + chapterId + '/' + side)
      return {
        content: texts[chapterId + '/' + side] ?? '',
        rev: 1,
        segments: [],
        updatedAt: 0
      } as TextRecord
    }
  }
}

const call = (name: string, args: unknown = {}): { id: string; name: string; args: string } => ({
  id: 'c1',
  name,
  args: typeof args === 'string' ? args : JSON.stringify(args)
})

describe('the tool list', () => {
  it('offers exactly two tools, and neither of them writes', () => {
    const names = CHAT_TOOL_DEFINITIONS.map((tool) => tool.function.name)
    expect(names).toEqual(['list_chapters', 'read_chapter'])
    // A write tool would undo the property the whole feature rests on, so the absence is asserted.
    const text = JSON.stringify(CHAT_TOOL_DEFINITIONS).toLowerCase()
    for (const verb of ['write', 'save', 'update', 'delete', 'apply', 'ghi', 'xóa']) {
      expect(text).not.toContain('"' + verb)
    }
  })
})

describe('list_chapters', () => {
  it('names each chapter and whether it has text', () => {
    const result = createChatTools(libraryOf(), WORK).run(call('list_chapters'))
    expect(result.content).toContain('1. Chương 1')
    expect(result.content).toContain('bản dịch: chưa')
    expect(result.content).toContain('2. Chương 2')
    expect(result.content).toContain('bản dịch: có')
    expect(result.detail).toBe('Liệt kê 2 chương')
  })

  it('says so plainly when there are no chapters', () => {
    const result = createChatTools(libraryOf(), OTHER).run(call('list_chapters'))
    expect(result.content).toContain('chưa có chương nào')
  })
})

describe('read_chapter', () => {
  it('reads the source of a chapter by its number', () => {
    const library = libraryOf({ 'ch-2/source': 'Nội dung chương hai.' })
    const result = createChatTools(library, WORK).run(
      call('read_chapter', { chapter: 2, side: 'source' })
    )

    expect(result.content).toContain('Nội dung chương hai.')
    expect(result.detail).toContain('Chương 2 · bản gốc')
    expect(library.reads).toEqual([WORK + '/ch-2/source'])
  })

  it('says a chapter is empty rather than returning nothing', () => {
    const result = createChatTools(libraryOf(), WORK).run(
      call('read_chapter', { chapter: 1, side: 'target' })
    )
    expect(result.content).toContain('chưa có nội dung')
    expect(result.detail).toContain('trống')
  })

  it('cuts an overlong chapter and says it cut', () => {
    const library = libraryOf({ 'ch-1/source': 'x'.repeat(TOOL_TEXT_MAX + 100) })
    const result = createChatTools(library, WORK).run(
      call('read_chapter', { chapter: 1, side: 'source' })
    )

    expect(result.content).toContain('Đã cắt')
    expect(result.detail).toContain('đã cắt')
  })

  it('reports a missing chapter as something the model can act on', () => {
    const result = createChatTools(libraryOf(), WORK).run(
      call('read_chapter', { chapter: 99, side: 'source' })
    )
    expect(result.content).toContain('LỖI')
    expect(result.content).toContain('Không có chương số 99')
  })

  it('rejects bad arguments without throwing', () => {
    const tools = createChatTools(libraryOf(), WORK)
    expect(tools.run(call('read_chapter', 'không-phải-json')).content).toContain('LỖI')
    expect(tools.run(call('read_chapter', { side: 'source' })).content).toContain('Thiếu số chương')
    expect(tools.run(call('read_chapter', { chapter: 1, side: 'cả hai' })).content).toContain(
      'phải là "source"'
    )
  })

  it('reports an unknown tool instead of throwing', () => {
    expect(createChatTools(libraryOf(), WORK).run(call('delete_everything')).content).toContain(
      'Không có công cụ'
    )
  })

  /**
   * The scoping property, stated as a test: the work is bound at construction and the model has no
   * parameter for it, so another work cannot be reached even by asking for a chapter that exists
   * there. The read that does happen carries the bound id, never one the model chose.
   */
  it('cannot reach another work, because there is no way to name one', () => {
    const library = libraryOf({ 'ch-1/source': 'bí mật của tác phẩm khác' })
    const result = createChatTools(library, OTHER).run(
      call('read_chapter', { chapter: 1, side: 'source' })
    )

    expect(result.content).toContain('LỖI')
    expect(library.reads).toEqual([])
  })
})
