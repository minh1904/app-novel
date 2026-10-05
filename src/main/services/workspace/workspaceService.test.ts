import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { LibraryStore } from '../library/library'
import { WorkspaceService } from './workspaceService'
import type { WorkspaceState } from '../../../shared/contracts/workspace'

const tempDir = createTempDirs()
const opened: LibraryStore[] = []

afterEach(() => {
  for (const library of opened.splice(0)) library.close()
})

function open(dir: string): LibraryStore {
  const library = LibraryStore.open({ dataDir: dir })
  opened.push(library)
  return library
}

describe('WorkspaceService', () => {
  it('loads an empty workspace and preserves order after reopening', () => {
    const dir = tempDir()
    const library = open(dir)
    const service = new WorkspaceService(library)
    expect(service.load().state).toEqual({ version: 1, tabs: [], activeWorkId: null })

    const a = library.create({ title: 'A', sourceLang: 'en' })
    const b = library.create({ title: 'B', sourceLang: 'ja' })
    const chapter = library.createChapter(b.id, 'Hai').chapter
    const state: WorkspaceState = {
      version: 1,
      tabs: [
        { workId: a.id, areaId: 'chapters', location: { name: 'work' } },
        { workId: b.id, areaId: 'context', location: { name: 'chapter', chapterId: chapter.id } }
      ],
      activeWorkId: b.id
    }
    service.save(state)
    library.close()
    opened.splice(opened.indexOf(library), 1)
    expect(new WorkspaceService(open(dir)).load()).toEqual({ state, notices: [] })
  })

  it('drops missing works and falls back when a chapter was deleted', () => {
    const library = open(tempDir())
    const a = library.create({ title: 'A', sourceLang: 'en' })
    const chapter = library.createChapter(a.id, 'Một').chapter
    const service = new WorkspaceService(library)
    service.save({
      version: 1,
      tabs: [
        { workId: 'missing', areaId: 'chapters', location: { name: 'work' } },
        { workId: a.id, areaId: 'context', location: { name: 'chapter', chapterId: chapter.id } }
      ],
      activeWorkId: a.id
    })
    library.deleteChapter(a.id, chapter.id)
    const loaded = service.load()
    expect(loaded.state.tabs).toEqual([
      { workId: a.id, areaId: 'context', location: { name: 'work' } }
    ])
    expect(loaded.notices).toHaveLength(2)
  })

  it('rejects duplicate tabs and reports a database write failure', () => {
    const library = open(tempDir())
    const service = new WorkspaceService(library)
    const tab = { workId: 'a', areaId: 'chapters', location: { name: 'work' } as const }
    expect(() => service.save({ version: 1, tabs: [tab, tab], activeWorkId: 'a' })).toThrow('trùng')
    library.close()
    opened.splice(opened.indexOf(library), 1)
    expect(() => service.save({ version: 1, tabs: [], activeWorkId: null })).toThrow()
  })
})
