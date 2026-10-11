import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeltaBuffer } from './DeltaBuffer'

describe('DeltaBuffer (Task 6.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('batches hundreds of small deltas into a bounded number of commits', () => {
    const commits: string[] = []
    const buffer = new DeltaBuffer({
      intervalMs: 40,
      onCommit: (text) => commits.push(text)
    })

    // Simulate 300 rapid token deltas within 100ms
    for (let i = 0; i < 300; i++) {
      buffer.append(`t${i} `)
      if (i % 50 === 0) {
        vi.advanceTimersByTime(10) // 10ms increments
      }
    }

    // Advance to trigger remaining timers
    vi.advanceTimersByTime(50)
    buffer.flush()

    // Commits count should be much smaller than 300 (bounded commit rate)
    expect(commits.length).toBeLessThan(10)
    expect(commits.length).toBeGreaterThan(0)

    // Final committed text contains all tokens
    const lastCommit = commits[commits.length - 1]
    expect(lastCommit).toContain('t0 ')
    expect(lastCommit).toContain('t299 ')
  })

  it('flushes immediately on flushNow()', () => {
    const commits: string[] = []
    const buffer = new DeltaBuffer({
      intervalMs: 40,
      onCommit: (text) => commits.push(text)
    })

    buffer.append('Hello ')
    buffer.append('world!')
    expect(commits).toEqual([])

    buffer.flush()
    expect(commits).toEqual(['Hello world!'])
  })

  it('safely closes unclosed Markdown code fences', () => {
    // 1. Text without open fence
    expect(DeltaBuffer.safeTailFence('Normal text')).toBe('Normal text')
    expect(DeltaBuffer.safeTailFence('```js\nconsole.log(1)\n```')).toBe(
      '```js\nconsole.log(1)\n```'
    )

    // 2. Open code fence
    const openBlock = 'Here is code:\n```typescript\nconst x = 10;'
    const safe = DeltaBuffer.safeTailFence(openBlock)
    expect(safe).toBe('Here is code:\n```typescript\nconst x = 10;\n```')

    // 3. Already closed fence
    expect(DeltaBuffer.safeTailFence(safe)).toBe(safe)
  })
})
