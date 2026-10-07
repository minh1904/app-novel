import { describe, expect, it } from 'vitest'
import { createSaveQueue } from './autosave'

function deferred(): { promise: Promise<void>; resolve(): void; reject(error: Error): void } {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('save queue', () => {
  it('runs one save at a time and sends only the newest value queued meanwhile', async () => {
    const saved: string[] = []
    const gates = [deferred(), deferred()]
    let call = 0
    const queue = createSaveQueue<string>(
      async (value) => {
        saved.push(value)
        await gates[call++]!.promise
      },
      () => undefined
    )

    const done = queue.push('a')
    void queue.push('b')
    void queue.push('c')
    expect(saved).toEqual(['a'])
    gates[0]!.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(saved).toEqual(['a', 'c'])
    gates[1]!.resolve()
    await done
    expect(saved).toEqual(['a', 'c'])
  })

  it('reports a failed save and keeps going', async () => {
    const errors: unknown[] = []
    const saved: string[] = []
    const queue = createSaveQueue<string>(
      async (value) => {
        if (value === 'bad') throw new Error('Hỏng')
        saved.push(value)
      },
      (error) => errors.push(error)
    )
    await queue.push('bad')
    await queue.push('good')
    expect(errors).toHaveLength(1)
    expect(saved).toEqual(['good'])
  })
})
