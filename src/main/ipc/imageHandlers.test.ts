import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/contracts/channels'
import { IMAGE_MAX_PER_WORK } from '../../shared/contracts/images'
import type { WorkSummary } from '../../shared/contracts/library'
import type { Result } from '../../shared/contracts/result'
import { LibraryStore } from '../services/library/library'
import { fakeImageDataUrl } from '../testing/testImage'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

type Call = <T = unknown>(channel: Channel, raw?: unknown) => Result<T>

function setup(dataDir = tempDir()): { call: Call; dataDir: string } {
  const library = LibraryStore.open({ dataDir })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  return { call: (channel, raw) => handlers[channel](raw) as Result<never>, dataDir }
}

const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error('expected ok, got ' + result.error.code)
  return result.value
}

function createWork(call: Call): string {
  return value(call<WorkSummary>(CHANNELS.worksCreate, { title: 'A', sourceLang: 'en' })).id
}

describe('images IPC', () => {
  it('stores an image and reads the same bytes back', () => {
    const { call } = setup()
    const workId = createWork(call)
    const url = fakeImageDataUrl('image/png', 300, 9)
    const { id } = value(call<{ id: string }>(CHANNELS.imagesPut, { workId, data: url }))
    expect(id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(value(call<string | null>(CHANNELS.imagesGet, { workId, imageId: id }))).toBe(url)
  })

  it('survives closing and reopening the library', () => {
    const { call, dataDir } = setup()
    const workId = createWork(call)
    const url = fakeImageDataUrl('image/jpeg', 150)
    const { id } = value(call<{ id: string }>(CHANNELS.imagesPut, { workId, data: url }))

    for (const store of stores.splice(0)) store.close()
    const reopened = setup(dataDir).call
    expect(value(reopened<string | null>(CHANNELS.imagesGet, { workId, imageId: id }))).toBe(url)
  })

  it('reading a deleted or unknown image id gives null, not an error', () => {
    const { call } = setup()
    const workId = createWork(call)
    const { id } = value(
      call<{ id: string }>(CHANNELS.imagesPut, { workId, data: fakeImageDataUrl('image/gif') })
    )

    value(call<void>(CHANNELS.imagesDelete, { workId, imageId: id }))
    expect(value(call<string | null>(CHANNELS.imagesGet, { workId, imageId: id }))).toBeNull()

    const randomId = '00000000-0000-4000-8000-000000000000'
    expect(value(call<string | null>(CHANNELS.imagesGet, { workId, imageId: randomId }))).toBeNull()
  })

  it('deleting an already-deleted image is not an error', () => {
    const { call } = setup()
    const workId = createWork(call)
    const { id } = value(
      call<{ id: string }>(CHANNELS.imagesPut, { workId, data: fakeImageDataUrl('image/webp') })
    )
    value(call<void>(CHANNELS.imagesDelete, { workId, imageId: id }))
    const result = call<void>(CHANNELS.imagesDelete, { workId, imageId: id })
    expect(result.ok).toBe(true)
  })

  it('rejects a put once the work already has the maximum number of images', () => {
    const { call } = setup()
    const workId = createWork(call)
    for (let i = 0; i < IMAGE_MAX_PER_WORK; i++) {
      value(
        call<{ id: string }>(CHANNELS.imagesPut, {
          workId,
          data: fakeImageDataUrl('image/png', 40, i % 256)
        })
      )
    }
    const result = call(CHANNELS.imagesPut, { workId, data: fakeImageDataUrl('image/png', 40, 1) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })

  it('rejects a format outside the accepted list', () => {
    const { call } = setup()
    const workId = createWork(call)
    const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64')
    const result = call(CHANNELS.imagesPut, { workId, data: svg })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })

  it('rejects an unknown work id and a malformed request without touching storage', () => {
    const { call } = setup()
    const missingWork = call(CHANNELS.imagesPut, {
      workId: '00000000-0000-4000-8000-000000000000',
      data: fakeImageDataUrl('image/png')
    })
    expect(missingWork.ok).toBe(false)

    const workId = createWork(call)
    const malformed = call(CHANNELS.imagesPut, { workId, extra: 'field', data: 'not a url' })
    expect(malformed.ok).toBe(false)
    if (!malformed.ok) expect(malformed.error.code).toBe('validation')
  })
})
