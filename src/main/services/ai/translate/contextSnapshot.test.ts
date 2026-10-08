import { afterEach, describe, expect, it } from 'vitest'
import { segment } from '../../../../shared/segmentation/segmenter'
import { createCharacter, setDyad } from '../../../infra/storage/addressingEntries'
import { createTempDirs } from '../../../testing/testing'
import { GlossaryService } from '../../context/glossaryService'
import { LibraryStore } from '../../library/library'
import {
  canonicalJson,
  parseSnapshot,
  promptFromSnapshot,
  rebuildTranslateRequest,
  takeContextSnapshot
} from './contextSnapshot'
import { buildTranslateRequest } from './translatePrompt'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

const SOURCE = '韩立は南宫婉に言った。\n\n霊剣を抜いた。'

function setup(): { library: LibraryStore; workId: string; chapterId: string } {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const work = library.create({ title: 'A', sourceLang: 'ja', genre: 'Tiên hiệp' })
  const chapter = library.createChapter(work.id, 'Một').chapter
  library.saveText(work.id, chapter.id, 'source', SOURCE, 0, segment(SOURCE, 'ja'))
  return { library, workId: work.id, chapterId: chapter.id }
}

function populate(library: LibraryStore, workId: string): void {
  const glossary = new GlossaryService(library, () => 1000)
  glossary.create(workId, { source: '霊剣', target: 'linh kiếm', status: 'approved' })
  glossary.create(workId, { source: '刀', target: 'đao', status: 'pending' })
  library.withWork(workId, (db) => {
    const a = createCharacter(db, { source: '韩立', target: 'Hàn Lập', gender: 'male' }, 1000)
    const b = createCharacter(
      db,
      { source: '南宫婉', target: 'Nam Cung Uyển', gender: 'female' },
      1000
    )
    createCharacter(db, { source: '厉飞雨', target: 'Lệ Phi Vũ', gender: 'male' }, 1000)
    setDyad(
      db,
      {
        sourceCharacterId: a.id,
        targetCharacterId: b.id,
        speakerPronoun: 'ta',
        recipientPronoun: 'nàng'
      },
      1000
    )
  })
}

describe('takeContextSnapshot', () => {
  it('gives the same hash for the same context', () => {
    const { library, workId, chapterId } = setup()
    populate(library, workId)
    const first = takeContextSnapshot(library, workId, chapterId, SOURCE)
    const again = takeContextSnapshot(library, workId, chapterId, SOURCE)
    expect(again.hash).toBe(first.hash)
    expect(again.json).toBe(first.json)
  })

  it('takes approved glossary only, and pairs and characters that are in the chapter', () => {
    const { library, workId, chapterId } = setup()
    populate(library, workId)
    const { snapshot } = takeContextSnapshot(library, workId, chapterId, SOURCE)
    expect(snapshot.glossary.map((entry) => entry.target)).toEqual(['linh kiếm'])
    expect(snapshot.characters.map((character) => character.target).sort()).toEqual([
      'Hàn Lập',
      'Nam Cung Uyển'
    ])
    expect(snapshot.dyads).toHaveLength(1)
    expect(snapshot.sourceLang).toBe('ja')
  })

  it('does not change for an edit to a character who is not in the chapter', () => {
    const { library, workId, chapterId } = setup()
    populate(library, workId)
    const before = takeContextSnapshot(library, workId, chapterId, SOURCE).hash
    library.withWork(workId, (db) =>
      createCharacter(db, { source: '墨大夫', target: 'Mặc đại phu' }, 2000)
    )
    expect(takeContextSnapshot(library, workId, chapterId, SOURCE).hash).toBe(before)
  })

  it('changes when an approved glossary entry is added', () => {
    const { library, workId, chapterId } = setup()
    populate(library, workId)
    const before = takeContextSnapshot(library, workId, chapterId, SOURCE).hash
    new GlossaryService(library, () => 2000).create(workId, {
      source: '言',
      target: 'nói',
      status: 'approved'
    })
    expect(takeContextSnapshot(library, workId, chapterId, SOURCE).hash).not.toBe(before)
  })
})

describe('canonicalJson', () => {
  it('sorts keys at every level and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: 2 } })).toBe('{"a":{"c":2,"d":[3,1]},"b":1}')
  })
})

describe('rebuildTranslateRequest', () => {
  it('rebuilds the request of a batch with glossary, pairs, characters and previous paragraphs', () => {
    const { library, workId, chapterId } = setup()
    populate(library, workId)
    const record = takeContextSnapshot(library, workId, chapterId, SOURCE)
    const units = [{ id: 'u2', text: '霊剣を抜いた。' }]
    const previous = ['韩立は南宫婉に言った。']
    // What runBatch sent.
    const sent = buildTranslateRequest(
      promptFromSnapshot(record.snapshot, units[0].text, previous),
      [{ tempId: '[1]', originalId: 'u2', text: units[0].text }]
    )
    expect(sent.messages[1].content).toContain('linh kiếm')
    expect(sent.messages[1].content).toContain('Hàn Lập')
    expect(sent.messages[1].content).toContain('韩立は南宫婉に言った。')

    // Read back from what is stored: the snapshot JSON and the trace.
    const rebuilt = rebuildTranslateRequest(
      { previous, contextHash: sent.requestHash },
      parseSnapshot(record.json),
      units
    )
    expect(rebuilt.matches).toBe(true)
    expect(rebuilt.requestHash).toBe(sent.requestHash)
  })
})
