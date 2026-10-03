import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import {
  CHAT_BLOCK_TEXT_MAX,
  CHAT_BLOCKS_MAX,
  CHAT_HISTORY_TURNS_MAX,
  CHAT_QUESTION_MAX,
  CHAT_TOTAL_TEXT_MAX,
  chatSendSchema,
  type ChatContextBlock,
  type ChatSendInput,
  type ChatTurn
} from './aiChat'

/**
 * Trần kích thước của một lượt chat. Ngữ cảnh và lịch sử là **văn bản renderer gửi lên**, nên tầng
 * này là chỗ duy nhất chặn được một chương dài đi qua IPC mỗi lượt. Mỗi test dưới đây là một cách
 * payload có thể phình, và trần tổng tồn tại vì từng phần đều dưới trần riêng vẫn có thể cộng lại
 * thành quá lớn.
 */

const ID = '7f1c2e5a-5b4d-4d5e-9c3a-1b2c3d4e5f60'
const CHAPTER_ID = '2b3c4d5e-6f70-4812-9a3b-4c5d6e7f8091'

function input(patch: Partial<ChatSendInput> = {}): unknown {
  const base: ChatSendInput = {
    workId: ID,
    chapterId: CHAPTER_ID,
    connectionId: ID,
    model: 'gemini-flash-latest',
    mode: 'hoi',
    sourceLang: 'en',
    question: 'Dịch tự nhiên hơn giúp tôi.',
    history: [],
    context: []
  }
  return { ...base, ...patch }
}

function block(text: string): ChatContextBlock {
  return { kind: 'range', label: 'Đoạn đang sửa', detail: '1 đoạn', text }
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

  it('từ chối câu hỏi rỗng', () => {
    expect(firstIssue(input({ question: '   ' }))).toBe('Chưa có câu hỏi.')
  })

  it('từ chối câu hỏi quá dài', () => {
    expect(firstIssue(input({ question: 'a'.repeat(CHAT_QUESTION_MAX + 1) }))).toBe(
      'Câu hỏi quá dài.'
    )
  })

  it('từ chối một khối ngữ cảnh quá dài', () => {
    expect(firstIssue(input({ context: [block('a'.repeat(CHAT_BLOCK_TEXT_MAX + 1))] }))).toBe(
      'Một khối ngữ cảnh quá dài.'
    )
  })

  it('từ chối quá nhiều khối ngữ cảnh', () => {
    const many = Array.from({ length: CHAT_BLOCKS_MAX + 1 }, () => block('x'))
    expect(firstIssue(input({ context: many }))).toBe('Quá nhiều khối ngữ cảnh.')
  })

  it('từ chối hội thoại quá nhiều lượt', () => {
    const many = Array.from({ length: CHAT_HISTORY_TURNS_MAX + 1 }, () => turn('x'))
    expect(firstIssue(input({ history: many }))).toBe(
      'Hội thoại quá dài; hãy bắt đầu hội thoại mới.'
    )
  })

  // Đây là ca mà trần riêng từng phần không bắt được: mười khối, mỗi khối đúng trần của nó.
  it('từ chối khi tổng văn bản vượt trần dù từng phần đều hợp lệ', () => {
    const count = Math.ceil(CHAT_TOTAL_TEXT_MAX / CHAT_BLOCK_TEXT_MAX) + 1
    const blocks = Array.from({ length: count }, () => block('a'.repeat(CHAT_BLOCK_TEXT_MAX)))
    expect(blocks.length).toBeLessThanOrEqual(CHAT_BLOCKS_MAX)
    for (const one of blocks) expect(one.text.length).toBeLessThanOrEqual(CHAT_BLOCK_TEXT_MAX)
    expect(firstIssue(input({ context: blocks }))).toBe(
      'Câu hỏi kèm ngữ cảnh quá lớn; hãy chọn phạm vi nhỏ hơn.'
    )
  })

  it('tính cả lịch sử và câu hỏi vào trần tổng', () => {
    const turns = Array.from({ length: 11 }, () => turn('a'.repeat(CHAT_BLOCK_TEXT_MAX)))
    expect(firstIssue(input({ history: turns }))).toBe(
      'Câu hỏi kèm ngữ cảnh quá lớn; hãy chọn phạm vi nhỏ hơn.'
    )
  })

  it('từ chối chế độ và ngôn ngữ không có trong danh sách', () => {
    expect(firstIssue(input({ mode: 'agent' as never }))).toBe('Chế độ không hợp lệ.')
    expect(firstIssue(input({ sourceLang: 'vi' as never }))).toBe('Ngôn ngữ nguồn không hợp lệ.')
  })

  it('từ chối trường lạ', () => {
    expect(firstIssue({ ...(input() as object), lạ: true })).not.toBeNull()
  })
})
