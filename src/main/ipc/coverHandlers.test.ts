import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/channels'
import type { WorkSummary } from '../../shared/library'
import type { Result } from '../../shared/result'
import { LibraryStore } from '../services/library/library'
import { fakeJpegDataUrl } from '../testing/testCover'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

type Call = <T = unknown>(channel: Channel, raw?: unknown) => Result<T>

function setup(): Call {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  return (channel, raw) => handlers[channel](raw) as Result<never>
}

const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error('expected ok, got ' + result.error.code)
  return result.value
}

describe('cover IPC', () => {
  it('creates with a cover, reads it back, replaces it and removes it', () => {
    const call = setup()
    const work = value(
      call<WorkSummary>(CHANNELS.worksCreate, {
        title: 'A',
        sourceLang: 'en',
        cover: fakeJpegDataUrl(90)
      })
    )
    expect(work.coverVersion).not.toBeNull()
    expect(value(call<string | null>(CHANNELS.worksCoverGet, { id: work.id }))).toBe(
      fakeJpegDataUrl(90)
    )

    value(call<WorkSummary>(CHANNELS.worksCoverSet, { id: work.id, cover: fakeJpegDataUrl(95, 7) }))
    expect(value(call<string | null>(CHANNELS.worksCoverGet, { id: work.id }))).toBe(
      fakeJpegDataUrl(95, 7)
    )

    const removed = value(call<WorkSummary>(CHANNELS.worksCoverSet, { id: work.id, cover: null }))
    expect(removed.coverVersion).toBeNull()
    expect(value(call<string | null>(CHANNELS.worksCoverGet, { id: work.id }))).toBeNull()
  })

  it.each([
    ['a non-JPEG data URL', 'data:image/png;base64,AAAA'],
    ['a remote URL', 'https://example.com/cover.jpg'],
    ['a local path', 'C:\\Users\\me\\cover.jpg'],
    ['an oversized payload', 'data:image/jpeg;base64,' + 'A'.repeat(2_000_000)],
    ['a number', 42]
  ])('rejects %s and leaves the cover alone', (_name, cover) => {
    const call = setup()
    const work = value(
      call<WorkSummary>(CHANNELS.worksCreate, {
        title: 'A',
        sourceLang: 'en',
        cover: fakeJpegDataUrl()
      })
    )
    const result = call(CHANNELS.worksCoverSet, { id: work.id, cover })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
    expect(value(call<string | null>(CHANNELS.worksCoverGet, { id: work.id }))).toBe(
      fakeJpegDataUrl()
    )
  })

  it('rejects a cover with the right prefix that is not a JPEG', () => {
    const call = setup()
    const work = value(call<WorkSummary>(CHANNELS.worksCreate, { title: 'A', sourceLang: 'en' }))
    const notAnImage = Buffer.from('definitely not an image').toString('base64')
    const result = call(CHANNELS.worksCoverSet, {
      id: work.id,
      cover: 'data:image/jpeg;base64,' + notAnImage
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })

  it('rejects a create request whose cover is not a JPEG data URL', () => {
    const call = setup()
    const result = call(CHANNELS.worksCreate, {
      title: 'A',
      sourceLang: 'en',
      cover: 'data:image/png;base64,AAAA'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })
})
