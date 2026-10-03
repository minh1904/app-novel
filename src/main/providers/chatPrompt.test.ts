import { describe, expect, it } from 'vitest'
import { FENCE, type ChatSendInput } from '../../shared/aiChat'
import { buildChatMessages, systemPrompt } from './chatPrompt'

/**
 * The prompt is behaviour, so it gets tests like any other behaviour.
 *
 * This file exists because of a bug that reached the screen with every other test green: the Hỏi
 * prompt said "không viết lại bản dịch", so asking "dịch chương này" got back *"tôi không thể dịch
 * toàn bộ chương"*. The model was obeying. Nothing in the suite looked at what we were telling it,
 * which is how an instruction can be wrong for as long as nobody reads it again.
 */

const WORK = '11111111-2222-4333-8444-555555555555'
const CHAPTER = '66666666-7777-4888-8999-aaaaaaaaaaaa'
const CONNECTION = '7f1c2e5a-5b4d-4d5e-9c3a-1b2c3d4e5f60'

function input(patch: Partial<ChatSendInput> = {}): ChatSendInput {
  return {
    workId: WORK,
    chapterId: CHAPTER,
    connectionId: CONNECTION,
    model: 'gemini-flash-latest',
    mode: 'hoi',
    sourceLang: 'en',
    question: 'Dịch chương này',
    history: [],
    context: [],
    ...patch
  }
}

const chapterBlock = {
  kind: 'chapter-source' as const,
  label: 'Bản gốc của chương',
  detail: '12 ký tự',
  text: 'Winter came.'
}

describe('systemPrompt', () => {
  // The regression. "Không được ghi" and "không được giúp" are different instructions.
  it('Hỏi lets the model translate on screen; it only may not claim to have saved', () => {
    const prompt = systemPrompt('hoi')
    expect(prompt).toContain('kể cả khi họ nhờ dịch')
    expect(prompt).not.toContain('Không viết lại bản dịch')
    expect(prompt).toContain('đã sửa hay đã lưu')
  })

  it('Sửa asks for the replacement inside a fence', () => {
    const prompt = systemPrompt('sua')
    expect(prompt).toContain(FENCE)
    expect(prompt).toContain('toàn bộ bản dịch của chương')
  })

  it('both modes tell the model the chapter is already attached', () => {
    for (const mode of ['hoi', 'sua'] as const) {
      // Otherwise the model asks the user to paste in a chapter that was sent with the question.
      expect(systemPrompt(mode)).toContain('không** đòi người dùng dán lại nội dung')
    }
  })

  it('stays byte-identical between turns, so it can be a cache prefix later', () => {
    expect(systemPrompt('hoi')).toBe(systemPrompt('hoi'))
    expect(systemPrompt('hoi')).not.toBe(systemPrompt('sua'))
  })
})

describe('buildChatMessages', () => {
  it('leads with the system prompt and ends with the question', () => {
    const messages = buildChatMessages(input({ context: [chapterBlock] }))
    expect(messages[0].role).toBe('system')
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'Dịch chương này' })
  })

  /**
   * Context goes in its own user message, not inside the system prompt: the system prompt has to stay
   * identical between turns to ever work as a cache prefix, and context changes every turn.
   */
  it('puts context in a separate message, never in the system prompt', () => {
    const messages = buildChatMessages(input({ context: [chapterBlock] }))
    expect(messages[0].content).not.toContain('Winter came.')
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('Winter came.')
    expect(messages[1].content).toContain('Bản gốc của chương')
  })

  it('sends no context message when there is no context', () => {
    const messages = buildChatMessages(input())
    expect(messages).toHaveLength(2)
  })

  it('puts the history between the context and the new question', () => {
    const messages = buildChatMessages(
      input({
        context: [chapterBlock],
        history: [
          { role: 'user', text: 'Câu cũ' },
          { role: 'assistant', text: 'Đáp cũ' }
        ]
      })
    )
    expect(messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'user',
      'assistant',
      'user'
    ])
    expect(messages[2].content).toBe('Câu cũ')
  })

  it('names the source language so the model is not guessing it', () => {
    const messages = buildChatMessages(input({ context: [chapterBlock], sourceLang: 'zh-Hans' }))
    expect(messages[1].content).toContain('zh-Hans')
  })

  it('same input gives the same messages', () => {
    const asked = input({ context: [chapterBlock] })
    expect(buildChatMessages(asked)).toEqual(buildChatMessages(asked))
  })
})
