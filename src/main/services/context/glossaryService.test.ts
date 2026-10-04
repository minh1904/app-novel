import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { LibraryStore } from '../library/library'
import { GlossaryService } from './glossaryService'

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
  service: GlossaryService
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

  const service = new GlossaryService(library, () => clock++)

  return { library, work, chapter1, chapter2, service }
}

describe('GlossaryService', () => {
  it('thực hiện các thao tác CRUD cho thuật ngữ', () => {
    const { work, service } = createSetup()

    const created = service.create(work.id, {
      source: '韩立',
      target: 'Hàn Lập',
      notes: 'Nhân vật chính',
      aliases: ['Lập Ca']
    })

    expect(created.id).toBeDefined()
    expect(created.source).toBe('韩立')
    expect(created.aliases).toEqual(['Lập Ca'])

    const fetched = service.get(work.id, created.id)
    expect(fetched?.target).toBe('Hàn Lập')

    const list = service.list(work.id, { query: '韩立' })
    expect(list).toHaveLength(1)

    const updated = service.update(work.id, created.id, {
      target: 'Hàn Lập (sửa)'
    })
    expect(updated.target).toBe('Hàn Lập (sửa)')

    service.delete(work.id, created.id)
    expect(service.get(work.id, created.id)).toBeNull()
  })

  it('nhập thuật ngữ từ tệp Names.txt và báo cáo chi tiết các dòng bị bỏ qua', () => {
    const { work, service } = createSetup()

    // Create an existing entry first to test collision
    service.create(work.id, {
      source: '韩立',
      target: 'Hàn Lập'
    })

    const fileContent = `
# Comment dòng đầu
// Comment dòng hai
韩立=Hàn Lập Đã Có
筑基=Trúc Cơ
南宫婉=Nam Cung Uyển

Dòng lỗi thiếu dấu bằng
=Thiếu nguồn
Trùng nguồn tệp=Dịch 1
Trùng nguồn tệp=Dịch 2
`

    const result = service.importNames(work.id, fileContent)

    // '筑基', '南宫婉', 'Trùng nguồn tệp' should be imported: 3
    expect(result.importedCount).toBe(3)
    // Skipped:
    // - 韩立 (already exists in DB)
    // - Dòng lỗi thiếu dấu bằng (missing =)
    // - =Thiếu nguồn (empty source)
    // - Trùng nguồn tệp=Dịch 2 (duplicate source in file)
    expect(result.skippedCount).toBe(4)

    const list = service.list(work.id)
    expect(list.map((e) => e.source)).toContain('筑基')
    expect(list.map((e) => e.source)).toContain('南宫婉')
  })

  it('so khớp thuật ngữ hiệu lực trong văn bản chương', () => {
    const { work, chapter1, chapter2, service } = createSetup()

    // Universal
    service.create(work.id, {
      source: '掌天瓶',
      target: 'Chưởng Thiên Bình'
    })
    // Only in chapter 1
    service.create(work.id, {
      source: '七玄门',
      target: 'Thất Huyền Môn',
      fromChapterId: chapter1.chapter.id,
      toChapterId: chapter1.chapter.id
    })

    const text1 = '他握着掌天瓶，回到了七玄门。'
    const matched1 = service.match(work.id, chapter1.chapter.id, text1)
    expect(matched1.map((m) => m.entry.source)).toEqual(['七玄门', '掌天瓶'])

    // In chapter 2, '七玄门' is out of scope
    const matched2 = service.match(work.id, chapter2.chapter.id, text1)
    expect(matched2.map((m) => m.entry.source)).toEqual(['掌天瓶'])
  })

  it('kiểm tra tuân thủ thuật ngữ trên bản dịch', () => {
    const { work, chapter1, service } = createSetup()

    service.create(work.id, {
      source: '韩立',
      target: 'Hàn Lập'
    })
    service.create(work.id, {
      source: '脏话',
      target: 'Từ Cấm',
      forbidden: true
    })

    const src = '韩立快步前行。'
    const tgtWithoutTerm = 'Hắn bước nhanh về phía trước.'
    const report1 = service.checkCompliance(work.id, chapter1.chapter.id, src, tgtWithoutTerm)
    expect(report1.hasIssues).toBe(true)
    expect(report1.issues[0].type).toBe('missing_target')

    const tgtWithForbidden = 'Hàn Lập nói Từ Cấm.'
    const report2 = service.checkCompliance(work.id, chapter1.chapter.id, src, tgtWithForbidden)
    expect(report2.hasIssues).toBe(true)
    expect(report2.issues.some((i) => i.type === 'forbidden_used')).toBe(true)
  })
})
