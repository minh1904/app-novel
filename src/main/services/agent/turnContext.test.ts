import { describe, expect, it } from 'vitest'
import { assembleTurnContext, contextLimitChars } from './turnContext'

const rounds = [
  {
    role: 'assistant' as const,
    content: '',
    tool_calls: [{ id: 'c1', type: 'function' as const, function: { name: 'x', arguments: '{}' } }]
  },
  { role: 'tool' as const, content: 'r'.repeat(50), tool_call_id: 'c1' }
]
const history = [
  { instruction: 'cũ nhất', answer: 'a'.repeat(100) },
  { instruction: 'giữa', answer: 'b'.repeat(100) },
  { instruction: 'gần nhất', answer: 'c'.repeat(10) }
]

describe('assembleTurnContext', () => {
  it('keeps everything in order when it fits', () => {
    const result = assembleTurnContext({
      system: 'S',
      toolChars: 0,
      history,
      current: 'hỏi',
      rounds,
      limitChars: 10_000
    })
    expect(result.droppedTurns).toBe(0)
    expect(result.messages.map((m) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
      'assistant',
      'user',
      'assistant',
      'user',
      'assistant',
      'tool'
    ])
  })

  it('drops the oldest turns first and never the system, instruction or call/result pairs', () => {
    const result = assembleTurnContext({
      system: 'S',
      toolChars: 0,
      history,
      current: 'hỏi nguyên văn',
      rounds,
      limitChars: 260
    })
    expect(result.droppedTurns).toBe(2)
    expect(result.messages[0]).toEqual({ role: 'system', content: 'S' })
    expect(result.messages.map((m) => m.content)).toContain('gần nhất')
    expect(result.messages.map((m) => m.content)).not.toContain('cũ nhất')
    expect(result.messages.slice(-3).map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(result.messages.at(-3)?.content).toBe('hỏi nguyên văn')

    const tiny = assembleTurnContext({
      system: 'S',
      toolChars: 0,
      history,
      current: 'hỏi',
      rounds,
      limitChars: 1
    })
    expect(tiny.droppedTurns).toBe(3)
    expect(tiny.messages).toHaveLength(4)
  })

  it('reserves output tokens out of the model window', () => {
    expect(
      contextLimitChars({ id: 'm', name: 'm', contextLimit: 100_000, outputLimit: 20_000 })
    ).toBe(160_000)
    expect(contextLimitChars(undefined)).toBeGreaterThan(0)
  })
})
