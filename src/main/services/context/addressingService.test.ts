import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { LibraryStore } from '../library/library'
import { AddressingService } from './addressingService'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

interface ServiceSetupContext {
  library: LibraryStore
  work: ReturnType<LibraryStore['create']>
  chapter1: ReturnType<LibraryStore['createChapter']>
  chapter2: ReturnType<LibraryStore['createChapter']>
  service: AddressingService
}

function createSetup(): ServiceSetupContext {
  const dataDir = tempDir()
  let clock = 1_000
  const library = LibraryStore.open({ dataDir, now: () => clock++ })
  stores.push(library)

  const work = library.create({
    title: 'Phàm Nhân Tu Tiên',
    sourceLang: 'zh-Hans'
  })
  const chapter1 = library.createChapter(work.id, 'Chương 1')
  const chapter2 = library.createChapter(work.id, 'Chương 2')

  const service = new AddressingService(library, () => clock++)

  return { library, work, chapter1, chapter2, service }
}

describe('AddressingService', () => {
  it('thực hiện các nghiệp vụ CRUD cho nhân vật', () => {
    const { work, service } = createSetup()

    const created = service.createCharacter(work.id, {
      source: '韩立',
      target: 'Hàn Lập',
      gender: 'male',
      role: 'Nhân vật chính',
      aliases: ['Lập Ca']
    })

    expect(created.id).toBeDefined()
    expect(created.target).toBe('Hàn Lập')

    const fetched = service.getCharacter(work.id, created.id)
    expect(fetched).toEqual(created)

    const list = service.listCharacters(work.id, { query: 'Hàn' })
    expect(list).toHaveLength(1)

    const updated = service.updateCharacter(work.id, created.id, {
      role: 'Thiên Tôn'
    })
    expect(updated.role).toBe('Thiên Tôn')

    service.deleteCharacter(work.id, created.id)
    expect(service.getCharacter(work.id, created.id)).toBeNull()
  })

  it('thực hiện các nghiệp vụ quản lý ma trận xưng hô (dyad)', () => {
    const { work, chapter1, chapter2, service } = createSetup()

    const charA = service.createCharacter(work.id, {
      source: '韩立',
      target: 'Hàn Lập',
      gender: 'male'
    })
    const charB = service.createCharacter(work.id, {
      source: '南宫婉',
      target: 'Nam Cung Uyển',
      gender: 'female'
    })

    const dyad = service.setDyad(work.id, {
      sourceCharacterId: charA.id,
      targetCharacterId: charB.id,
      speakerPronoun: 'ta',
      recipientPronoun: 'nàng',
      fromChapterId: chapter2.chapter.id
    })

    expect(dyad.id).toBeDefined()
    expect(dyad.speakerPronoun).toBe('ta')

    const dyads = service.listDyads(work.id)
    expect(dyads).toHaveLength(1)

    // Hiệu lực tại chương 1 (chưa tới chương 2)
    const eff1 = service.getEffectiveDyads(work.id, chapter1.chapter.id)
    expect(eff1).toHaveLength(0)

    // Hiệu lực tại chương 2
    const eff2 = service.getEffectiveDyads(work.id, chapter2.chapter.id)
    expect(eff2).toHaveLength(1)
    expect(eff2[0].sourceCharacter.target).toBe('Hàn Lập')

    // Đánh giá tuân thủ xưng hô qua service
    const reportValid = service.evaluateCompliance(work.id, chapter2.chapter.id, [
      'Hàn Lập nói: "Nàng yên tâm, ta sẽ bảo vệ nàng."'
    ])
    expect(reportValid.hasIssues).toBe(false)

    const reportInvalid = service.evaluateCompliance(work.id, chapter2.chapter.id, [
      'Hàn Lập nhìn Nam Cung Uyển nói: "Tôi không biết."'
    ])
    expect(reportInvalid.hasIssues).toBe(true)

    // Xóa dyad
    service.deleteDyad(work.id, dyad.id)
    expect(service.getDyad(work.id, dyad.id)).toBeNull()
  })
})
