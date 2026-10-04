import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/contracts/channels'
import type {
  ContextEntryItem,
  GlossaryComplianceReport,
  ImportNamesResult
} from '../../shared/contracts/glossary'
import type { Result } from '../../shared/contracts/result'
import { LibraryStore } from '../services/library/library'
import { createTempDirs } from '../testing/testing'
import { createLibraryHandlers, guardHandlers } from './libraryHandlers'

const tempDir = createTempDirs()
const stores: LibraryStore[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

interface SetupContext {
  library: LibraryStore
  workId: string
  chapterId: string
  handlers: ReturnType<typeof createLibraryHandlers>
  call: <T = unknown>(channel: Channel, raw?: unknown) => Promise<Result<T>> | Result<T>
}

function setup(): SetupContext {
  const library = LibraryStore.open({ dataDir: tempDir() })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  const work = library.create({ title: 'Phàm Nhân Tu Tiên', sourceLang: 'zh-Hans' })
  const chapter1 = library.createChapter(work.id, 'Chương 1')

  return {
    library,
    workId: work.id,
    chapterId: chapter1.chapter.id,
    handlers,
    call: <T = unknown>(channel: Channel, raw?: unknown): Promise<Result<T>> | Result<T> =>
      handlers[channel](raw) as Promise<Result<T>> | Result<T>
  }
}

const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error('expected ok, got ' + result.error.code + ': ' + result.error.message)
  return result.value
}

const codeOf = (result: Result<unknown>): string | undefined =>
  result.ok ? undefined : result.error.code

describe('glossary IPC handlers', () => {
  it('tạo, lấy, cập nhật, liệt kê và xóa thuật ngữ qua IPC channels', async () => {
    const { call, workId } = setup()

    // 1. Create
    const createRes = await call<ContextEntryItem>(CHANNELS.glossaryCreate, {
      workId,
      source: '韩立',
      target: 'Hàn Lập',
      notes: 'Nhân vật chính',
      aliases: ['Lập Ca']
    })
    expect(createRes.ok).toBe(true)
    const created = value(createRes)
    expect(created.source).toBe('韩立')
    expect(created.aliases).toEqual(['Lập Ca'])

    // 2. Get
    const getRes = await call<ContextEntryItem>(CHANNELS.glossaryGet, {
      workId,
      entryId: created.id
    })
    expect(getRes.ok).toBe(true)
    expect(value(getRes).target).toBe('Hàn Lập')

    // 3. List
    const listRes = await call<{ entries: ContextEntryItem[] }>(CHANNELS.glossaryList, {
      workId,
      query: '韩立'
    })
    expect(listRes.ok).toBe(true)
    expect(value(listRes).entries).toHaveLength(1)

    // 4. Update
    const updateRes = await call<ContextEntryItem>(CHANNELS.glossaryUpdate, {
      workId,
      entryId: created.id,
      target: 'Hàn Lập (sửa)'
    })
    expect(updateRes.ok).toBe(true)
    expect(value(updateRes).target).toBe('Hàn Lập (sửa)')

    // 5. Delete
    const deleteRes = await call<void>(CHANNELS.glossaryDelete, {
      workId,
      entryId: created.id
    })
    expect(deleteRes.ok).toBe(true)

    // Get after delete should return not_found
    const getAfterDelete = await call<ContextEntryItem>(CHANNELS.glossaryGet, {
      workId,
      entryId: created.id
    })
    expect(codeOf(getAfterDelete)).toBe('not_found')
  })

  it('từ chối dữ liệu đầu vào không hợp lệ hoặc xung đột trùng lặp', async () => {
    const { call, workId } = setup()

    // Validation failure: missing target
    const invalidRes = await call(CHANNELS.glossaryCreate, {
      workId,
      source: '韩立',
      target: '   '
    })
    expect(codeOf(invalidRes)).toBe('validation')

    // Create entry
    await call(CHANNELS.glossaryCreate, {
      workId,
      source: '筑基',
      target: 'Trúc Cơ'
    })

    // Conflict failure: duplicate source
    const dupRes = await call(CHANNELS.glossaryCreate, {
      workId,
      source: '筑基',
      target: 'Trúc Cơ Khác'
    })
    expect(codeOf(dupRes)).toBe('conflict')
  })

  it('nhập tệp Names.txt và kiểm tra tuân thủ bản dịch qua IPC', async () => {
    const { call, workId, chapterId } = setup()

    // Import names
    const importRes = await call<ImportNamesResult>(CHANNELS.glossaryImportNames, {
      workId,
      content: `
# Chú thích
韩立=Hàn Lập
筑基=Trúc Cơ
`
    })
    expect(importRes.ok).toBe(true)
    const importVal = value(importRes)
    expect(importVal.importedCount).toBe(2)
    expect(importVal.skippedCount).toBe(0)

    // Check compliance
    const complianceRes = await call<GlossaryComplianceReport>(
      CHANNELS.glossaryCheckCompliance,
      {
        workId,
        chapterId,
        sourceText: '韩立成功突破到了筑基期。',
        targetText: 'Hàn Lập đã đột phá thành công cảnh giới mới.' // thiếu Trúc Cơ
      }
    )
    expect(complianceRes.ok).toBe(true)
    const report = value(complianceRes)
    expect(report.hasIssues).toBe(true)
    expect(report.issues[0].term).toBe('Trúc Cơ')
  })

  it('chặn người gửi không được tin cậy qua guardHandlers', async () => {
    const { handlers, workId } = setup()
    const guarded = guardHandlers(handlers, () => false)

    const res = (await guarded[CHANNELS.glossaryList](
      {} as never,
      { workId }
    )) as Result<unknown>
    expect(codeOf(res)).toBe('untrusted_sender')
  })
})
