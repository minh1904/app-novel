import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/contracts/channels'
import type {
  AddressingDyadItem,
  AddressingDyadResolved,
  CharacterItem
} from '../../shared/contracts/addressing'
import type { Result } from '../../shared/contracts/result'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers } from './libraryHandlers'

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
  if (!result.ok)
    throw new Error('expected ok, got ' + result.error.code + ': ' + result.error.message)
  return result.value
}

describe('addressing IPC handlers', () => {
  it('quản lý nhân vật qua các kênh IPC addressing:characters:*', () => {
    const { library, call } = setup()
    const work = library.create({ title: 'Truyện Tu Tiên', sourceLang: 'zh-Hans' })

    // Create
    const char = value<CharacterItem>(
      call(CHANNELS.addressingCharactersCreate, {
        workId: work.id,
        source: '韩立',
        target: 'Hàn Lập',
        gender: 'male',
        role: 'Nhân vật chính',
        aliases: ['Lập Ca']
      })
    )

    expect(char.id).toBeDefined()
    expect(char.target).toBe('Hàn Lập')

    // Get
    const fetched = value<CharacterItem>(
      call(CHANNELS.addressingCharactersGet, { workId: work.id, characterId: char.id })
    )
    expect(fetched.id).toBe(char.id)

    // List
    const listRes = value<{ characters: CharacterItem[] }>(
      call(CHANNELS.addressingCharactersList, { workId: work.id, query: 'Hàn' })
    )
    expect(listRes.characters).toHaveLength(1)

    // Update
    const updated = value<CharacterItem>(
      call(CHANNELS.addressingCharactersUpdate, {
        workId: work.id,
        characterId: char.id,
        role: 'Đại tu sĩ'
      })
    )
    expect(updated.role).toBe('Đại tu sĩ')

    // Delete
    const delRes = call(CHANNELS.addressingCharactersDelete, {
      workId: work.id,
      characterId: char.id
    })
    expect(delRes.ok).toBe(true)

    // Get after delete returns not_found
    const getDeleted = call(CHANNELS.addressingCharactersGet, {
      workId: work.id,
      characterId: char.id
    })
    expect(getDeleted.ok).toBe(false)
    if (!getDeleted.ok) {
      expect(getDeleted.error.code).toBe('not_found')
    }
  })

  it('quản lý ma trận xưng hô và kiểm tra tuân thủ qua IPC', () => {
    const { library, call } = setup()
    const work = library.create({ title: 'Truyện Tu Tiên', sourceLang: 'zh-Hans' })
    const c1 = library.createChapter(work.id, 'Chương 1')
    const c2 = library.createChapter(work.id, 'Chương 2')

    const charA = value<CharacterItem>(
      call(CHANNELS.addressingCharactersCreate, {
        workId: work.id,
        source: '韩立',
        target: 'Hàn Lập',
        gender: 'male'
      })
    )
    const charB = value<CharacterItem>(
      call(CHANNELS.addressingCharactersCreate, {
        workId: work.id,
        source: '南宫婉',
        target: 'Nam Cung Uyển',
        gender: 'female'
      })
    )

    // Set dyad
    const dyad = value<AddressingDyadItem>(
      call(CHANNELS.addressingDyadsSet, {
        workId: work.id,
        sourceCharacterId: charA.id,
        targetCharacterId: charB.id,
        speakerPronoun: 'ta',
        recipientPronoun: 'nàng',
        fromChapterId: c2.chapter.id
      })
    )
    expect(dyad.id).toBeDefined()

    // Get dyad
    const fetchedDyad = value<AddressingDyadItem>(
      call(CHANNELS.addressingDyadsGet, { workId: work.id, dyadId: dyad.id })
    )
    expect(fetchedDyad.speakerPronoun).toBe('ta')

    // List dyads
    const dyadsList = value<{ dyads: AddressingDyadItem[] }>(
      call(CHANNELS.addressingDyadsList, { workId: work.id })
    )
    expect(dyadsList.dyads).toHaveLength(1)

    // Effective dyads for chapter 1 (empty) & chapter 2 (has dyad)
    const eff1 = value<{ dyads: AddressingDyadResolved[] }>(
      call(CHANNELS.addressingDyadsEffective, { workId: work.id, chapterId: c1.chapter.id })
    )
    expect(eff1.dyads).toHaveLength(0)

    const eff2 = value<{ dyads: AddressingDyadResolved[] }>(
      call(CHANNELS.addressingDyadsEffective, { workId: work.id, chapterId: c2.chapter.id })
    )
    expect(eff2.dyads).toHaveLength(1)
    expect(eff2.dyads[0].sourceCharacter.target).toBe('Hàn Lập')

    // Check compliance
    const complianceRes = value(
      call(CHANNELS.addressingCheckCompliance, {
        workId: work.id,
        chapterId: c2.chapter.id,
        paragraphs: ['Hàn Lập mỉm cười nhìn Nam Cung Uyển: "Nàng yên tâm, ta sẽ bảo vệ nàng."']
      })
    )
    expect(complianceRes).toMatchObject({
      hasIssues: false,
      checkedParagraphsCount: 1
    })

    // Delete dyad
    const delDyadRes = call(CHANNELS.addressingDyadsDelete, {
      workId: work.id,
      dyadId: dyad.id
    })
    expect(delDyadRes.ok).toBe(true)
  })
})
