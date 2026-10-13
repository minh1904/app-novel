import { afterEach, describe, expect, it } from 'vitest'
import { CHANNELS, type Channel } from '../../shared/contracts/channels'
import type {
  AppliedContext,
  ContextEntryItem,
  ContextReviewInfo,
  ContextReviewOutcome,
  GlossaryComplianceReport,
  ImportNamesResult
} from '../../shared/contracts/glossary'
import type { Result } from '../../shared/contracts/result'
import { saveExtraction } from '../infra/storage/contextEntries'
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
  if (!result.ok)
    throw new Error('expected ok, got ' + result.error.code + ': ' + result.error.message)
  return result.value
}

const codeOf = (result: Result<unknown>): string | undefined =>
  result.ok ? undefined : result.error.code

describe('glossary IPC handlers', () => {
  it('tạo, lấy, cập nhật, liệt kê và xóa thuật ngữ qua IPC channels', async () => {
    const { call, workId } = setup()

    // 1. Tạo mới
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

    // 2. Lấy chi tiết
    const getRes = await call<ContextEntryItem>(CHANNELS.glossaryGet, {
      workId,
      entryId: created.id
    })
    expect(getRes.ok).toBe(true)
    expect(value(getRes).target).toBe('Hàn Lập')

    // 3. Danh sách
    const listRes = await call<{ entries: ContextEntryItem[] }>(CHANNELS.glossaryList, {
      workId,
      query: '韩立'
    })
    expect(listRes.ok).toBe(true)
    expect(value(listRes).entries).toHaveLength(1)

    // 4. Cập nhật
    const updateRes = await call<ContextEntryItem>(CHANNELS.glossaryUpdate, {
      workId,
      entryId: created.id,
      target: 'Hàn Lập (sửa)'
    })
    expect(updateRes.ok).toBe(true)
    expect(value(updateRes).target).toBe('Hàn Lập (sửa)')

    // 5. Xóa
    const deleteRes = await call<void>(CHANNELS.glossaryDelete, {
      workId,
      entryId: created.id
    })
    expect(deleteRes.ok).toBe(true)

    // Lấy sau khi xóa phải trả về not_found
    const getAfterDelete = await call<ContextEntryItem>(CHANNELS.glossaryGet, {
      workId,
      entryId: created.id
    })
    expect(codeOf(getAfterDelete)).toBe('not_found')
  })

  it('từ chối dữ liệu đầu vào không hợp lệ hoặc xung đột trùng lặp', async () => {
    const { call, workId } = setup()

    // Lỗi xác thực: thiếu target
    const invalidRes = await call(CHANNELS.glossaryCreate, {
      workId,
      source: '韩立',
      target: '   '
    })
    expect(codeOf(invalidRes)).toBe('validation')

    // Tạo mục
    await call(CHANNELS.glossaryCreate, {
      workId,
      source: '筑基',
      target: 'Trúc Cơ'
    })

    // Lỗi xung đột: trùng lặp source
    const dupRes = await call(CHANNELS.glossaryCreate, {
      workId,
      source: '筑基',
      target: 'Trúc Cơ Khác'
    })
    expect(codeOf(dupRes)).toBe('conflict')
  })

  it('nhập tệp Names.txt và kiểm tra tuân thủ bản dịch qua IPC', async () => {
    const { call, workId, chapterId } = setup()

    // Nhập tệp names
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

    // Kiểm tra độ tuân thủ
    const complianceRes = await call<GlossaryComplianceReport>(CHANNELS.glossaryCheckCompliance, {
      workId,
      chapterId,
      sourceText: '韩立成功突破到了筑基期。',
      targetText: 'Hàn Lập đã đột phá thành công cảnh giới mới.' // thiếu Trúc Cơ
    })
    expect(complianceRes.ok).toBe(true)
    const report = value(complianceRes)
    expect(report.hasIssues).toBe(true)
    expect(report.issues[0].term).toBe('Trúc Cơ')
  })

  it('chặn người gửi không được tin cậy qua guardHandlers', async () => {
    const { handlers, workId } = setup()
    const guarded = guardHandlers(handlers, () => false)

    const res = (await guarded[CHANNELS.glossaryList]({} as never, { workId })) as Result<unknown>
    expect(codeOf(res)).toBe('untrusted_sender')
  })
})

describe('glossary review IPC', () => {
  /** AI candidates of `type`, written the way an extraction run writes them. */
  function seed(ctx: SetupContext, sources: string[], type = 'person', aliases: string[] = []) {
    ctx.library.withWork(ctx.workId, (db) =>
      saveExtraction(db, {
        runId: 'run-1',
        model: 'mock-model',
        promptHash: 'sha256:p',
        scannedChapterIds: [],
        candidates: sources.map((source) => ({
          source,
          target: source + ' (vi)',
          termType: type,
          status: 'pending' as const,
          aliases,
          evidence: [{ chapterId: ctx.chapterId, quote: source + ' xuất hiện' }]
        })),
        now: 10
      })
    )
    return value(
      ctx.call<{ entries: ContextEntryItem[] }>(CHANNELS.glossaryList, {
        workId: ctx.workId,
        status: 'pending'
      }) as Result<{ entries: ContextEntryItem[] }>
    ).entries.filter((entry) => sources.includes(entry.source))
  }
  const byId = (ctx: SetupContext, id: string) =>
    value(
      ctx.call<ContextEntryItem>(CHANNELS.glossaryGet, {
        workId: ctx.workId,
        entryId: id
      }) as Result<ContextEntryItem>
    )

  it('edits then approves, keeping the extraction quote', async () => {
    const ctx = setup()
    const [entry] = seed(ctx, ['韩立'])
    const approved = value(
      await ctx.call<ContextEntryItem>(CHANNELS.glossaryReview, {
        workId: ctx.workId,
        command: {
          kind: 'edit_approve',
          entryId: entry!.id,
          expectedUpdatedAt: entry!.updatedAt,
          target: 'Hàn Lập'
        }
      })
    )
    expect(approved).toMatchObject({ status: 'approved', target: 'Hàn Lập' })
    const info = value(
      await ctx.call<{ entries: ContextReviewInfo[] }>(CHANNELS.glossaryReviewInfo, {
        workId: ctx.workId,
        entryIds: [entry!.id]
      })
    )
    expect(info.entries[0]?.evidence.map((quote) => quote.quote)).toEqual(['韩立 xuất hiện'])
  })

  it('refuses a stale updatedAt with conflict and leaves the entry pending; rejects with a reason', async () => {
    const ctx = setup()
    const [entry] = seed(ctx, ['先生'])
    const stale = await ctx.call(CHANNELS.glossaryReview, {
      workId: ctx.workId,
      command: { kind: 'approve', entryId: entry!.id, expectedUpdatedAt: entry!.updatedAt - 1 }
    })
    expect(codeOf(stale)).toBe('conflict')
    expect(byId(ctx, entry!.id).status).toBe('pending')

    const rejected = value(
      await ctx.call<ContextEntryItem>(CHANNELS.glossaryReview, {
        workId: ctx.workId,
        command: {
          kind: 'reject',
          entryId: entry!.id,
          expectedUpdatedAt: entry!.updatedAt,
          reason: 'danh xưng chung'
        }
      })
    )
    expect(rejected).toMatchObject({ status: 'rejected', notes: 'danh xưng chung' })
  })

  it('refuses a bulk approval that mixes term types and changes nothing', async () => {
    const ctx = setup()
    const [person] = seed(ctx, ['韩立'])
    const [place] = seed(ctx, ['天南'], 'place')
    const mixed = await ctx.call(CHANNELS.glossaryBulkApprove, {
      workId: ctx.workId,
      items: [person!, place!].map((entry) => ({
        entryId: entry.id,
        expectedUpdatedAt: entry.updatedAt
      }))
    })
    expect(codeOf(mixed)).toBe('validation')
    expect(byId(ctx, person!.id).status).toBe('pending')
    expect(byId(ctx, place!.id).status).toBe('pending')
  })

  it('approves four of five names and reports the one with a taken alias as conflict', async () => {
    const ctx = setup()
    value(
      await ctx.call(CHANNELS.glossaryCreate, {
        workId: ctx.workId,
        source: 'アキラ',
        target: 'Akira',
        aliases: ['アキ']
      })
    )
    const names = seed(ctx, ['甲', '乙', '丙', '丁'])
    const [taken] = seed(ctx, ['彰'], 'person', ['アキ'])
    const { results } = value(
      await ctx.call<{ results: ContextReviewOutcome[] }>(CHANNELS.glossaryBulkApprove, {
        workId: ctx.workId,
        items: [...names, taken!].map((entry) => ({
          entryId: entry.id,
          expectedUpdatedAt: entry.updatedAt
        }))
      })
    )
    expect(results.filter((result) => result.ok)).toHaveLength(4)
    expect(results.find((result) => result.entryId === taken!.id)).toMatchObject({
      ok: false,
      code: 'conflict'
    })
    expect(byId(ctx, taken!.id).status).toBe('pending')

    // Editing the aliases resolves it.
    const approved = value(
      await ctx.call<ContextEntryItem>(CHANNELS.glossaryReview, {
        workId: ctx.workId,
        command: {
          kind: 'edit_approve',
          entryId: taken!.id,
          expectedUpdatedAt: taken!.updatedAt,
          aliases: []
        }
      })
    )
    expect(approved.status).toBe('approved')
  })
})

describe('applied context IPC', () => {
  it('lists the approved entry of the chapter and never a pending one', async () => {
    const ctx = setup()
    for (const [source, status] of [
      ['韩立', 'approved'],
      ['南宫婉', 'pending']
    ] as const) {
      value(
        await ctx.call(CHANNELS.glossaryCreate, {
          workId: ctx.workId,
          source,
          target: source + ' vi',
          status
        })
      )
    }
    const applied = value(
      await ctx.call<AppliedContext>(CHANNELS.glossaryApplied, {
        workId: ctx.workId,
        chapterId: ctx.chapterId
      })
    )
    expect(applied.glossary.map((entry) => entry.source)).toEqual(['韩立'])
    expect(applied).toMatchObject({ dyads: [], characters: [] })
  })
})
