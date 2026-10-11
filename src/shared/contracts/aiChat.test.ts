import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import {
  CHAT_HISTORY_TURNS_MAX,
  CHAT_QUESTION_MAX,
  CHAT_TURN_TEXT_MAX,
  chatSendSchema,
  type ChatSendInput,
  type ChatTurn
} from './aiChat'

/**
 * Hình dạng của một lượt gửi. Lượt không mang văn bản chương nữa, nên thứ
 * còn phải chặn là lịch sử phình to và một vị trí vô nghĩa: số đoạn âm, vùng chọn ngược.
 */

const ID = '7f1c2e5a-5b4d-4d5e-9c3a-1b2c3d4e5f60'
const CHAPTER_ID = '2b3c4d5e-6f70-4812-9a3b-4c5d6e7f8091'

function input(patch: Partial<ChatSendInput> = {}): unknown {
  const base: ChatSendInput = {
    workId: ID,
    chapterId: CHAPTER_ID,
    connectionId: ID,
    entryId: ID,
    sourceLang: 'en',
    question: 'Dịch tự nhiên hơn giúp tôi.',
    history: [],
    location: { caret: { source: null, target: 5 }, selection: null }
  }
  return { ...base, ...patch }
}

function turn(text: string): ChatTurn {
  return { role: 'user', text }
}

/** Thông điệp của lỗi đầu tiên, để khẳng định đúng trần nào đã chặn. */
function firstIssue(raw: unknown): string | null {
  const parsed = v.safeParse(chatSendSchema, raw)
  return parsed.success ? null : parsed.issues[0].message
}

describe('chatSendSchema', () => {
  it('nhận một lượt hợp lệ', () => {
    expect(firstIssue(input())).toBeNull()
  })

  it('nhận vùng chọn nhiều đoạn và vùng chọn một đoạn', () => {
    expect(
      firstIssue(
        input({
          location: {
            caret: { source: 3, target: 12 },
            selection: { side: 'target', from: 12, to: 14 }
          }
        })
      )
    ).toBeNull()
    expect(
      firstIssue(
        input({
          location: {
            caret: { source: 3, target: null },
            selection: { side: 'source', from: 3, to: 3 }
          }
        })
      )
    ).toBeNull()
  })

  it('từ chối số đoạn âm hoặc bằng 0', () => {
    expect(
      firstIssue(input({ location: { caret: { source: -1, target: null }, selection: null } }))
    ).toBe('Số đoạn đếm từ 1.')
    expect(
      firstIssue(
        input({
          location: {
            caret: { source: null, target: null },
            selection: { side: 'target', from: 0, to: 2 }
          }
        })
      )
    ).toBe('Số đoạn đếm từ 1.')
  })

  it('từ chối vùng chọn ngược', () => {
    expect(
      firstIssue(
        input({
          location: {
            caret: { source: null, target: 9 },
            selection: { side: 'target', from: 9, to: 4 }
          }
        })
      )
    ).toBe('Vùng chọn bị ngược.')
  })

  it('không còn nhận chế độ, ngữ cảnh hay khoảng văn bản', () => {
    const base = input() as object
    expect(v.safeParse(chatSendSchema, { ...base, mode: 'ask' }).success).toBe(false)
    expect(v.safeParse(chatSendSchema, { ...base, context: [] }).success).toBe(false)
    expect(v.safeParse(chatSendSchema, { ...base, range: null }).success).toBe(false)
  })

  it('đòi vị trí', () => {
    const rest: Partial<ChatSendInput> = { ...(input() as ChatSendInput) }
    delete rest.location
    expect(v.safeParse(chatSendSchema, rest).success).toBe(false)
  })

  it('chọn model bằng id của mục, không phải tên model', () => {
    expect(v.safeParse(chatSendSchema, input({ entryId: ID })).success).toBe(true)
    expect(v.safeParse(chatSendSchema, input({ entryId: 'gemini-flash-latest' })).success).toBe(
      false
    )
  })

  it('từ chối câu hỏi rỗng', () => {
    expect(firstIssue(input({ question: '   ' }))).toBe('Chưa có câu hỏi.')
  })

  it('từ chối câu hỏi quá dài', () => {
    expect(firstIssue(input({ question: 'a'.repeat(CHAT_QUESTION_MAX + 1) }))).toBe(
      'Câu hỏi quá dài.'
    )
  })

  it('từ chối hội thoại quá nhiều lượt', () => {
    const many = Array.from({ length: CHAT_HISTORY_TURNS_MAX + 1 }, () => turn('x'))
    expect(firstIssue(input({ history: many }))).toBe(
      'Hội thoại quá dài; hãy bắt đầu hội thoại mới.'
    )
  })

  it('tính cả lịch sử và câu hỏi vào trần tổng', () => {
    const turns = Array.from({ length: 11 }, () => turn('a'.repeat(CHAT_TURN_TEXT_MAX)))
    expect(firstIssue(input({ history: turns }))).toBe(
      'Hội thoại quá dài; hãy bắt đầu hội thoại mới.'
    )
  })

  it('từ chối ngôn ngữ không hợp lệ', () => {
    expect(firstIssue(input({ sourceLang: 'bad_lang' as never }))).toBe(
      'Ngôn ngữ nguồn phải là thẻ BCP-47 hợp lệ.'
    )
  })

  it('từ chối trường lạ', () => {
    expect(firstIssue({ ...(input() as object), lạ: true })).not.toBeNull()
  })
})
