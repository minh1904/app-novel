import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { StorageError } from './errors'
import { LibraryStore } from './library'
import { fakeJpegDataUrl } from './testCover'
import { createTempDirs } from './testing'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

function open(dataDir: string): LibraryStore {
  let clock = 1_000
  const store = LibraryStore.open({ dataDir, now: () => clock++ })
  stores.push(store)
  return store
}

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return error instanceof StorageError ? error.code : 'not-a-storage-error'
  }
  return undefined
}

describe('LibraryStore cover', () => {
  it('has no cover by default', () => {
    const store = open(tempDir())
    const work = store.create({ title: 'A', sourceLang: 'en' })
    expect(work.coverVersion).toBeNull()
    expect(store.getCover(work.id)).toBeNull()
  })

  it('stores a cover chosen at creation and returns the same bytes', () => {
    const store = open(tempDir())
    const cover = fakeJpegDataUrl(500, 0x33)
    const work = store.create({ title: 'A', sourceLang: 'en', cover })
    expect(work.coverVersion).not.toBeNull()
    expect(store.getCover(work.id)).toBe(cover)
    expect(store.list().works[0].coverVersion).toBe(work.coverVersion)
  })

  it('replaces and removes a cover, changing the version and updatedAt each time', () => {
    const store = open(tempDir())
    const work = store.create({ title: 'A', sourceLang: 'en' })

    const first = store.setCover(work.id, fakeJpegDataUrl(100, 1))
    expect(first.coverVersion).not.toBeNull()
    expect(first.updatedAt).toBeGreaterThan(work.updatedAt)

    const second = store.setCover(work.id, fakeJpegDataUrl(120, 2))
    expect(second.coverVersion).toBeGreaterThan(first.coverVersion as number)
    expect(store.getCover(work.id)).toBe(fakeJpegDataUrl(120, 2))

    const removed = store.setCover(work.id, null)
    expect(removed.coverVersion).toBeNull()
    expect(store.getCover(work.id)).toBeNull()
    expect(store.list().works[0].coverVersion).toBeNull()
  })

  it('rejects an invalid cover without changing the work or creating a file', () => {
    const dir = tempDir()
    const store = open(dir)
    const invalid = 'data:image/jpeg;base64,AAAA'

    expect(codeOf(() => store.create({ title: 'A', sourceLang: 'en', cover: invalid }))).toBe(
      'validation'
    )
    expect(store.list().works).toEqual([])
    expect(readdirSync(join(dir, 'works')).filter((n) => n.endsWith('.mira'))).toEqual([])

    const work = store.create({ title: 'B', sourceLang: 'en', cover: fakeJpegDataUrl(80) })
    expect(codeOf(() => store.setCover(work.id, invalid))).toBe('validation')
    expect(store.getCover(work.id)).toBe(fakeJpegDataUrl(80))
  })

  it('keeps the cover after the app is reopened and when the index is rebuilt', () => {
    const dir = tempDir()
    let store = open(dir)
    const cover = fakeJpegDataUrl(300, 9)
    const work = store.create({ title: 'A', sourceLang: 'ja', cover })
    store.close()
    stores.length = 0
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(join(dir, 'library.db' + suffix), { force: true })
    }

    store = open(dir)
    expect(store.list().works[0].coverVersion).toBe(work.coverVersion)
    expect(store.getCover(work.id)).toBe(cover)
  })

  it('reports not_found for the cover of an unknown work', () => {
    const store = open(tempDir())
    expect(codeOf(() => store.getCover('11111111-1111-4111-8111-111111111111'))).toBe('not_found')
  })
})
