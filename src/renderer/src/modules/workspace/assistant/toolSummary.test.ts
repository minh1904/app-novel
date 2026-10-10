import { describe, expect, it } from 'vitest'
import type { ChatToolStep } from '../../../../../shared/contracts/aiChat'
import { summarizeTools, toolCalls } from './toolSummary'

const read = (chapter: number, page = 'đoạn 1–40/80'): ChatToolStep => ({
  name: 'read_chapter',
  detail: `Chương ${chapter} · bản gốc — ${page}, 19.640 ký tự, còn tiếp`,
  status: 'ok'
})

const edit: ChatToolStep = {
  name: 'propose_edit',
  detail: 'Đề xuất sửa đoạn 3 bản dịch · chương 2',
  status: 'ok',
  proposal: {
    type: 'edit',
    proposalId: 'p',
    partIds: ['x'],
    chapterId: 'c',
    label: 'Sửa đoạn 3 bản dịch'
  }
}

describe('summarizeTools', () => {
  it('reads like the spec example: chapters read, searches, proposals', () => {
    const steps: ChatToolStep[] = [
      read(2),
      read(5),
      {
        name: 'search_work',
        detail: 'Tìm "魔王" · bản gốc — 3 chỗ ở 2 chương, trả 3',
        status: 'ok'
      },
      edit
    ]
    expect(summarizeTools(steps)).toBe('Đã đọc 2 chương, tìm 1 lần, đề xuất 1 sửa')
  })

  it('counts a chapter read in several pages once', () => {
    expect(summarizeTools([read(5), read(5, 'đoạn 41–80/80'), read(5, 'đoạn 81–90/90')])).toBe(
      'Đã đọc 1 chương'
    )
  })

  it('counts lookups, position and proposals by kind', () => {
    const steps: ChatToolStep[] = [
      { name: 'get_current_chapter', detail: 'Chương 2 · vị trí người dùng', status: 'ok' },
      {
        name: 'read_segments',
        detail: 'Chương 2 · bản dịch — đoạn 3–5 kèm đoạn tương ứng',
        status: 'ok'
      },
      { name: 'list_glossary', detail: 'Thuật ngữ — 3/3 mục', status: 'ok' },
      { name: 'list_addressing', detail: 'Xưng hô — 1 cặp', status: 'ok' },
      edit,
      {
        name: 'propose_translation',
        detail: 'Đề xuất dịch đoạn 6 bản gốc · chương 2',
        status: 'ok',
        proposal: {
          type: 'translation',
          proposalId: 'q',
          partIds: ['y'],
          chapterId: 'c',
          label: 'Dịch đoạn 6'
        }
      },
      {
        name: 'propose_glossary_term',
        detail: 'Đề xuất thuật ngữ 魔王 → Ma vương',
        status: 'ok',
        proposal: {
          type: 'term',
          entryId: 'e',
          term: '魔王',
          translation: 'Ma vương',
          label: 'Thuật ngữ'
        }
      }
    ]
    expect(summarizeTools(steps)).toBe(
      'Đã xem vị trí, đọc 1 chương, tra glossary/xưng hô 2 lần, đề xuất 1 sửa, 1 dịch, 1 thuật ngữ'
    )
  })

  it('keeps counting the other calls when one fails, and counts the failure apart', () => {
    const steps: ChatToolStep[] = [
      {
        name: 'read_chapter',
        detail: 'Không có chương số 9. Tác phẩm có 4 chương.',
        status: 'error'
      },
      read(2),
      edit
    ]
    expect(summarizeTools(steps)).toBe('Đã đọc 1 chương, đề xuất 1 sửa · 1 lần gọi lỗi')
  })

  it('leaves fallback notices out, and is empty with no tool call', () => {
    const fallback: ChatToolStep = { name: 'fallback', detail: 'Chuyển sang model dự phòng' }
    expect(toolCalls([fallback, read(1)])).toEqual([read(1)])
    expect(summarizeTools([fallback])).toBe('')
    expect(summarizeTools([])).toBe('')
  })

  it('reads an old turn whose steps have no status as done', () => {
    expect(
      summarizeTools([{ name: 'read_chapter', detail: 'Chương 3 · bản gốc — đoạn 1–2/2' }])
    ).toBe('Đã đọc 1 chương')
  })
})
