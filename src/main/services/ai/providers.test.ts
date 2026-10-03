import { afterEach, describe, expect, it } from 'vitest'
import { LibraryStore } from '../library/library'
import { createTempDirs } from '../../testing/testing'
import { MOCK_MODEL, MockProvider, mockTranslation } from '../../infra/providers/mockProvider'
import { provenanceFor } from './provenance'
import { reconcile } from '../../infra/providers/reconcile'
import {
  ProviderError,
  type TranslateRequest,
  type TranslateResponse
} from '../../infra/providers/types'

const request: TranslateRequest = {
  sourceLang: 'zh-Hans',
  targetLang: 'vi',
  segments: [
    { id: 'a', text: '山中药铺。' },
    { id: 'b', text: '第二句。' },
    { id: 'c', text: '第三句。' }
  ]
}

const response = (items: Array<[string, string]>): TranslateResponse => ({
  provider: 'p',
  model: 'm',
  items: items.map(([id, text]) => ({ id, text }))
})

describe('reconcile', () => {
  it('pairs answers with segments by id, whatever order they arrive in', () => {
    const result = reconcile(
      request,
      response([
        ['c', 'C'],
        ['a', 'A'],
        ['b', 'B']
      ])
    )
    expect(result.matched).toEqual([
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' }
    ])
    expect(result).toMatchObject({ missing: [], extra: [], duplicates: [] })
  })

  it('reports a missing id and puts no translation on any other segment', () => {
    const result = reconcile(
      request,
      response([
        ['a', 'A'],
        ['c', 'C']
      ])
    )
    expect(result.missing).toEqual(['b'])
    expect(result.matched.map((m) => m.id)).toEqual(['a', 'c'])
    expect(result.matched.find((m) => m.id === 'b')).toBeUndefined()
  })

  it('drops ids nobody asked for', () => {
    const result = reconcile(
      request,
      response([
        ['a', 'A'],
        ['b', 'B'],
        ['c', 'C'],
        ['z', 'Z'],
        ['z', 'Z2']
      ])
    )
    expect(result.extra).toEqual(['z'])
    expect(result.matched).toHaveLength(3)
  })

  it('uses the first answer for a repeated id and reports the repeat', () => {
    const result = reconcile(
      request,
      response([
        ['a', 'đầu'],
        ['a', 'sau'],
        ['b', 'B'],
        ['c', 'C']
      ])
    )
    expect(result.duplicates).toEqual(['a'])
    expect(result.matched[0]).toEqual({ id: 'a', text: 'đầu' })
  })

  it('treats an empty answer for a real sentence as missing, but not for a blank one', () => {
    const blank: TranslateRequest = {
      ...request,
      segments: [
        { id: 'a', text: '山' },
        { id: 'b', text: '   ' }
      ]
    }
    const result = reconcile(
      blank,
      response([
        ['a', '  '],
        ['b', '']
      ])
    )
    expect(result.missing).toEqual(['a'])
    expect(result.matched).toEqual([{ id: 'b', text: '' }])
  })

  it('answers nothing when the response is empty', () => {
    const result = reconcile(request, response([]))
    expect(result.missing).toEqual(['a', 'b', 'c'])
    expect(result.matched).toEqual([])
  })

  it('refuses a request that repeats a segment id', () => {
    const bad: TranslateRequest = {
      ...request,
      segments: [request.segments[0], request.segments[0]]
    }
    expect(() => reconcile(bad, response([]))).toThrow(/trùng/)
  })
})

describe('ProviderError', () => {
  it.each([
    ['rate_limited', true],
    ['network', true],
    ['invalid_response', true],
    ['auth', false],
    ['refused', false],
    ['cancelled', false]
  ] as const)('%s is retryable: %s', (kind, retryable) => {
    expect(new ProviderError(kind, 'x').retryable).toBe(retryable)
  })

  it('carries the time the provider asked us to wait', () => {
    expect(new ProviderError('rate_limited', 'x', { retryAfterMs: 1500 }).retryAfterMs).toBe(1500)
  })
})

describe('MockProvider', () => {
  const failureOf = async (
    provider: MockProvider,
    signal?: AbortSignal
  ): Promise<ProviderError> => {
    try {
      await provider.translate(request, { signal })
    } catch (error) {
      if (error instanceof ProviderError) return error
      throw error
    }
    throw new Error('expected a ProviderError')
  }

  it('translates three segments deterministically and says it is a mock', async () => {
    const provider = new MockProvider()
    const first = await provider.translate(request)
    const second = await provider.translate(request)
    expect(first).toEqual(second)
    expect(first.provider).toBe('mock')
    expect(first.model).toBe(MOCK_MODEL)
    expect(first.items).toEqual(
      request.segments.map((s) => ({ id: s.id, text: mockTranslation(s.text) }))
    )
    expect(first.items[0].text.startsWith('[giả lập]')).toBe(true)
    const result = reconcile(request, first)
    expect(result).toMatchObject({ missing: [], extra: [], duplicates: [] })
  })

  it('works without a network or a key: it never touches either', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (() => {
      throw new Error('network used')
    }) as typeof fetch
    try {
      await expect(new MockProvider().translate(request)).resolves.toBeDefined()
    } finally {
      globalThis.fetch = original
    }
  })

  it.each([
    ['missing_id', { missing: ['c'], extra: [], duplicates: [] }],
    ['duplicate_id', { missing: [], extra: [], duplicates: ['a'] }],
    ['extra_id', { missing: [], extra: ['khong-ai-yeu-cau'], duplicates: [] }],
    ['empty', { missing: ['a', 'b', 'c'], extra: [], duplicates: [] }]
  ] as const)(
    'can answer wrongly in the %s way, which reconcile catches',
    async (failure, expected) => {
      const answered = await new MockProvider({ failure }).translate(request)
      expect(reconcile(request, answered)).toMatchObject(expected)
    }
  )

  it('can answer in reverse order without losing any translation', async () => {
    const answered = await new MockProvider({ failure: 'shuffle' }).translate(request)
    expect(answered.items.map((i) => i.id)).toEqual(['c', 'b', 'a'])
    const result = reconcile(request, answered)
    expect(result.matched.map((m) => m.id)).toEqual(['a', 'b', 'c'])
    expect(result.matched[0].text).toBe(mockTranslation('山中药铺。'))
  })

  it('reports a rate limit with how long to wait, and as retryable', async () => {
    const error = await failureOf(new MockProvider({ failure: 'rate_limited', retryAfterMs: 2500 }))
    expect(error).toMatchObject({ kind: 'rate_limited', retryable: true, retryAfterMs: 2500 })
  })

  it('reports network and content problems as the right kind', async () => {
    expect(await failureOf(new MockProvider({ failure: 'network' }))).toMatchObject({
      kind: 'network',
      retryable: true
    })
    expect(await failureOf(new MockProvider({ failure: 'refused' }))).toMatchObject({
      kind: 'refused',
      retryable: false
    })
  })

  it('reports a bad key as not retryable', async () => {
    expect(await failureOf(new MockProvider({ failure: 'auth' }))).toMatchObject({
      kind: 'auth',
      retryable: false
    })
  })

  it('can be switched to a failure mode between calls', async () => {
    const provider = new MockProvider()
    await expect(provider.translate(request)).resolves.toBeDefined()
    provider.configure({ failure: 'network' })
    expect((await failureOf(provider)).kind).toBe('network')
  })

  it('stops at once when cancelled during the wait and returns nothing', async () => {
    const provider = new MockProvider({ delayMs: 10_000 })
    const controller = new AbortController()
    const started = Date.now()
    const pending = failureOf(provider, controller.signal)
    setTimeout(() => controller.abort(), 20)
    const error = await pending
    expect(error).toMatchObject({ kind: 'cancelled', retryable: false })
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('does not start when it is already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    expect((await failureOf(new MockProvider(), controller.signal)).kind).toBe('cancelled')
    expect((await failureOf(new MockProvider({ delayMs: 50 }), controller.signal)).kind).toBe(
      'cancelled'
    )
  })

  it('waits the configured delay when not cancelled', async () => {
    const started = Date.now()
    await new MockProvider({ delayMs: 60 }).translate(request)
    expect(Date.now() - started).toBeGreaterThanOrEqual(50)
  })
})

describe('provenance of provider output', () => {
  const tempDir = createTempDirs()
  const stores: LibraryStore[] = []
  afterEach(() => {
    for (const store of stores.splice(0)) store.close()
  })

  it('records the mock as "mock", not as a real AI translation', () => {
    const record = provenanceFor('seg', { provider: 'mock', model: MOCK_MODEL }, 99)
    expect(record).toEqual({
      segmentId: 'seg',
      origin: 'mock',
      provider: 'mock',
      model: MOCK_MODEL,
      at: 99
    })
  })

  it('records any other provider as AI, with provider, model and time', () => {
    const record = provenanceFor('seg', { provider: 'openrouter', model: 'deepseek' }, 7)
    expect(record).toEqual({
      segmentId: 'seg',
      origin: 'ai',
      provider: 'openrouter',
      model: 'deepseek',
      at: 7
    })
  })

  it('goes end to end: mock answer → reconcile → segments saved with mock provenance', async () => {
    const library = LibraryStore.open({ dataDir: tempDir() })
    stores.push(library)
    const work = library.create({ title: 'Thử', sourceLang: 'zh-Hans' })
    const chapter = library.createChapter(work.id, 'Một').chapter
    const source = library.saveText(work.id, chapter.id, 'source', '甲乙。丙丁。', 0, [
      { start: 0, end: 3 },
      { start: 3, end: 6 }
    ])

    const req: TranslateRequest = {
      sourceLang: 'zh-Hans',
      targetLang: 'vi',
      segments: source.segments.map((s) => ({
        id: s.id,
        text: '甲乙。丙丁。'.slice(s.start, s.end)
      }))
    }
    const answered = await new MockProvider({ failure: 'shuffle' }).translate(req)
    const { matched, missing } = reconcile(req, answered)
    expect(missing).toEqual([])

    const content = matched.map((m) => m.text).join('')
    let at = 0
    const segments = matched.map((m) => {
      const region = { start: at, end: at + m.text.length }
      at += m.text.length
      return region
    })
    const target = library.saveText(work.id, chapter.id, 'target', content, 0, segments)
    target.segments.forEach((segment, index) => {
      library.setProvenance(work.id, provenanceFor(segment.id, answered, 123 + index))
    })

    for (const segment of target.segments) {
      expect(library.getProvenance(work.id, segment.id)).toMatchObject({
        origin: 'mock',
        provider: 'mock',
        model: MOCK_MODEL
      })
    }
    expect(library.readText(work.id, chapter.id, 'target').content).toContain('[giả lập]')
  })
})
