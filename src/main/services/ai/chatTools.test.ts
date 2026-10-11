import { describe, expect, it } from 'vitest'
import type { ChapterItem } from '../../../shared/contracts/chapters'
import type { LinkRecord } from '../../../shared/contracts/links'
import type { TextRecord, TextSide } from '../../../shared/contracts/text'
import { createChatTools, TOOL_TEXT_MAX, type ChatToolLibrary } from './chatTools'

/**
 * Kiểm tra các công cụ tra cứu dữ liệu của model trong lượt hội thoại.
 *
 * Kiểm tra phạm vi dữ liệu: `workId` được cố định khi khởi tạo, model không thể truy cập sang tác phẩm khác.
 * Đồng thời kiểm tra các lỗi gọi sai tham số được trả về dưới dạng thông báo văn bản để model có thể tự khắc phục.
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
    },
    listLinks(): LinkRecord[] {
      return []
    }
  }
}

const call = (name: string, args: unknown = {}): { id: string; name: string; args: string } => ({
  id: 'c1',
  name,
  args: typeof args === 'string' ? args : JSON.stringify(args)
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

  it('reads an overlong chapter as a first page and says there is more', () => {
    const library = libraryOf({ 'ch-1/source': 'x'.repeat(TOOL_TEXT_MAX + 100) })
    const result = createChatTools(library, WORK).run(
      call('read_chapter', { chapter: 1, side: 'source' })
    )

    expect(result.content).toContain('còn tiếp, con trỏ: c1.source.p1.o20000.r1')
    expect(result.detail).toContain('còn tiếp')
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
   * Kiểm tra phạm vi truy cập: tác phẩm được liên kết cố định khi khởi tạo và mô hình không có
   * tham số để thay đổi, do đó không thể truy cập tác phẩm khác ngay cả khi yêu cầu chương tồn tại ở đó.
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
