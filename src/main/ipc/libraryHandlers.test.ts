import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/channels'
import type { WorkList, WorkSummary } from '../../shared/library'
import type { Result } from '../../shared/result'
import { LibraryStore } from '../storage/library'
import { createTempDirs } from '../storage/testing'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

interface Setup {
  library: LibraryStore
  call<T = unknown>(channel: Channel, raw?: unknown): Result<T>
}

function setup(): Setup {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  return { library, call: (channel, raw) => handlers[channel](raw) as Result<never> }
}

const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error('expected ok, got ' + result.error.code)
  return result.value
}

describe('library IPC handlers', () => {
  it('creates, reads, updates and lists works through validated calls', () => {
    const { call } = setup()
    const created = value(
      call<WorkSummary>(CHANNELS.worksCreate, {
        title: '  Ga tàu mùa tuyết đầu ',
        sourceLang: 'ja'
      })
    )
    expect(created.title).toBe('Ga tàu mùa tuyết đầu')

    const updated = value(
      call<WorkSummary>(CHANNELS.worksUpdate, { id: created.id, patch: { status: 'paused' } })
    )
    expect(updated.status).toBe('paused')
    expect(value(call<WorkSummary>(CHANNELS.worksGet, { id: created.id }))).toEqual(updated)
    expect(value(call<WorkList>(CHANNELS.worksList)).works).toHaveLength(1)
  })

  it('rejects an empty title with a field error and creates nothing', () => {
    const { call } = setup()
    const result = call<WorkSummary>(CHANNELS.worksCreate, { title: '   ', sourceLang: 'en' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('validation')
    expect(result.error.details?.[0]).toMatchObject({
      path: 'title',
      message: 'Nhập tên tác phẩm.'
    })
    expect(value(call<WorkList>(CHANNELS.worksList)).works).toEqual([])
  })

  it.each([
    ['a missing language', { title: 'A' }],
    ['an unknown language', { title: 'A', sourceLang: 'fr' }],
    ['an unexpected field', { title: 'A', sourceLang: 'en', path: 'C:\\evil' }],
    ['a non-object payload', 'hello'],
    ['null', null],
    ['an oversized title', { title: 'x'.repeat(201), sourceLang: 'en' }],
    ['an oversized author', { title: 'A', sourceLang: 'en', author: 'x'.repeat(201) }],
    ['a non-text genre', { title: 'A', sourceLang: 'en', genre: 5 }]
  ])('rejects %s without touching data', (_name, raw) => {
    const { call } = setup()
    const result = call(CHANNELS.worksCreate, raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
    expect(value(call<WorkList>(CHANNELS.worksList)).works).toEqual([])
  })

  it('rejects malformed ids and patches', () => {
    const { call } = setup()
    const id = value(call<WorkSummary>(CHANNELS.worksCreate, { title: 'A', sourceLang: 'en' })).id

    for (const raw of [
      { id: '../library', patch: { title: 'x' } },
      { id, patch: { status: 'done' } },
      { id, patch: { archived: 'yes' } },
      { id, patch: { title: 'x', extra: 1 } },
      { id },
      undefined
    ]) {
      const result = call(CHANNELS.worksUpdate, raw)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('validation')
    }
    expect(value(call<WorkSummary>(CHANNELS.worksGet, { id })).title).toBe('A')
  })

  it('returns not_found as data for an unknown id', () => {
    const { call } = setup()
    const result = call(CHANNELS.worksGet, { id: '11111111-1111-4111-8111-111111111111' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('not_found')
  })

  it('turns unexpected exceptions into an internal error without leaking details', () => {
    const { library, call } = setup()
    library.close()
    stores.length = 0
    const result = call(CHANNELS.worksList)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('internal')
      expect(result.error.message).not.toContain(join('works'))
    }
  })
})

describe('guardHandlers', () => {
  it('refuses untrusted senders before anything is validated or stored', () => {
    const { library } = setup()
    const guarded = guardHandlers(
      createLibraryHandlers(library),
      (sender: string) => sender === 'main'
    )

    const refused = guarded[CHANNELS.worksCreate]('iframe', {
      title: 'Injected',
      sourceLang: 'en'
    }) as Result<unknown>
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.error.code).toBe('untrusted_sender')
    expect(library.list().works).toEqual([])

    const allowed = guarded[CHANNELS.worksCreate]('main', {
      title: 'Real',
      sourceLang: 'en'
    }) as Result<unknown>
    expect(allowed.ok).toBe(true)
    expect(library.list().works).toHaveLength(1)
  })

  it('applies to every channel', () => {
    const { library } = setup()
    const guarded = guardHandlers(createLibraryHandlers(library), () => false)
    for (const channel of Object.values(CHANNELS)) {
      const result = guarded[channel]('anyone', undefined) as Result<unknown>
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('untrusted_sender')
    }
  })
})
