import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { BackupExported } from '../../shared/backup'
import { CHANNELS, type Channel } from '../../shared/channels'
import type { WorkSummary } from '../../shared/library'
import type { Result } from '../../shared/result'
import { LibraryStore } from '../storage/library'
import { createTempDirs } from '../storage/testing'
import type { FilePicker } from './filePicker'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

interface FakePicker extends FilePicker {
  save: string | null
  open: string | null
  suggested: string[]
}

function fakePicker(): FakePicker {
  const picker: FakePicker = {
    save: null,
    open: null,
    suggested: [],
    chooseSavePath: (name) => {
      picker.suggested.push(name)
      return Promise.resolve(picker.save)
    },
    chooseOpenPath: () => Promise.resolve(picker.open)
  }
  return picker
}

function setup(): {
  library: LibraryStore
  picker: FakePicker
  workId: string
  call<T = unknown>(channel: Channel, raw?: unknown): Promise<Result<T>>
} {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const picker = fakePicker()
  const handlers = createLibraryHandlers(library, picker)
  const work = library.create({ title: 'Hiệu thuốc: trên núi?', sourceLang: 'zh-Hans' })
  library.createChapter(work.id, 'Một')
  return {
    library,
    picker,
    workId: work.id,
    call: async (channel, raw) => (await handlers[channel](raw)) as Result<never>
  }
}

const codeOf = (result: Result<unknown>): string | undefined =>
  result.ok ? undefined : result.error.code

describe('backup IPC handlers', () => {
  it('suggests a safe file name and writes the backup where the user chose', async () => {
    const { call, picker, workId } = setup()
    const dir = tempDir()
    picker.save = join(dir, 'chon.mira')

    const result = await call<BackupExported>(CHANNELS.backupExport, { workId })
    expect(result).toEqual({ ok: true, value: { path: join(dir, 'chon.mira') } })
    expect(existsSync(join(dir, 'chon.mira'))).toBe(true)
    expect(picker.suggested[0]).toMatch(/^Hiệu thuốc trên núi — \d{4}-\d{2}-\d{2}\.mira$/)
    expect(picker.suggested[0]).not.toMatch(/[:?]/)
  })

  it('adds the extension when the dialog returns a name without it', async () => {
    const { call, picker, workId } = setup()
    const dir = tempDir()
    picker.save = join(dir, 'khong-duoi')
    const result = await call<BackupExported>(CHANNELS.backupExport, { workId })
    expect(result.ok && result.value.path).toBe(join(dir, 'khong-duoi.mira'))
    expect(readdirSync(dir)).toEqual(['khong-duoi.mira'])
  })

  it('reports a cancelled save as cancelled and creates nothing', async () => {
    const { call, picker, workId } = setup()
    picker.save = null
    const result = await call(CHANNELS.backupExport, { workId })
    expect(codeOf(result)).toBe('cancelled')
  })

  it('restores the chosen backup as a new work', async () => {
    const { call, picker, library, workId } = setup()
    const dir = tempDir()
    picker.save = join(dir, 'b.mira')
    await call(CHANNELS.backupExport, { workId })

    picker.open = join(dir, 'b.mira')
    const restored = await call<WorkSummary>(CHANNELS.backupRestore)
    expect(restored.ok && restored.value.id).not.toBe(workId)
    expect(library.list().works).toHaveLength(2)
    expect(restored.ok && restored.value.chapterCount).toBe(1)
  })

  it('reports a cancelled open as cancelled and changes nothing', async () => {
    const { call, picker, library } = setup()
    picker.open = null
    expect(codeOf(await call(CHANNELS.backupRestore))).toBe('cancelled')
    expect(library.list().works).toHaveLength(1)
  })

  it('turns a bad file into a readable error and leaves the library alone', async () => {
    const { call, picker, library } = setup()
    picker.open = join(tempDir(), 'khong-ton-tai.mira')
    const result = await call(CHANNELS.backupRestore)
    expect(result.ok).toBe(false)
    expect(library.list().works).toHaveLength(1)
  })

  it('refuses a save path inside the data directory', async () => {
    const { call, picker, library, workId } = setup()
    picker.save = join(library['dataDir'], 'works', workId + '.mira')
    const result = await call(CHANNELS.backupExport, { workId })
    expect(codeOf(result)).toBe('validation')
  })

  it.each([
    ['a missing work id', {}],
    ['a path-like work id', { workId: '../library' }],
    ['an unexpected field', { workId: '11111111-1111-4111-8111-111111111111', path: 'C:\\evil' }],
    ['null', null]
  ])('rejects %s before any dialog opens', async (_name, raw) => {
    const { call, picker } = setup()
    expect(codeOf(await call(CHANNELS.backupExport, raw))).toBe('validation')
    expect(picker.suggested).toEqual([])
  })

  it('cannot be given a path by the renderer: extra input is refused', async () => {
    const { call, workId } = setup()
    const result = await call(CHANNELS.backupExport, { workId, destination: 'C:\\x.mira' })
    expect(codeOf(result)).toBe('validation')
  })

  it('refuses untrusted senders before any dialog opens', async () => {
    const { library, picker, workId } = setup()
    const guarded = guardHandlers(createLibraryHandlers(library, picker), () => false)
    for (const [channel, raw] of [
      [CHANNELS.backupExport, { workId }],
      [CHANNELS.backupRestore, undefined]
    ] as const) {
      const result = (await guarded[channel]('iframe', raw)) as Result<unknown>
      expect(codeOf(result), channel).toBe('untrusted_sender')
    }
    expect(picker.suggested).toEqual([])
  })
})
