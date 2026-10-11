import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDirs } from '../testing/testing'
import { openDatabase } from '../infra/storage/sqlite'
import { workSchema } from '../infra/storage/workSchema'
import { migrate } from '../infra/storage/migrate'
import { listCatalogItems, listSourceBindings } from '../infra/storage/sourceStorage'
import { MatchingPreviewService } from './matching'

const tempDir = createTempDirs()

describe('MatchingPreviewService', () => {
  it('previews matching without touching DB and creates binding only on confirmation', () => {
    const dbPath = join(tempDir(), 'work.mira')
    const db = openDatabase(dbPath)
    migrate(db, workSchema)
    db.exec(`
      INSERT INTO work (id, title, source_lang, created_at, updated_at)
      VALUES ('w1', 'Tác phẩm', 'ja', 1, 1);
      INSERT INTO chapter (id, position, title, created_at, updated_at)
      VALUES ('c1', 0, 'Chương 1', 1, 1), ('c2', 1, 'Chương 2', 1, 1);
    `)

    const service = new MatchingPreviewService()

    const preview = service.createPreview({
      sourceId: 'builtin.folder',
      remoteWorkId: 'folder:raws',
      catalogItems: [
        { remoteChapterId: '01.txt', title: 'Chương 1 - Mở đầu', order: 1, access: 'public' },
        { remoteChapterId: '02.txt', title: 'Chapter 2', order: 2, access: 'public' },
        {
          remoteChapterId: '03.txt',
          title: 'Chương 3 - Chưa có ở Mira',
          order: 3,
          access: 'public'
        },
        {
          remoteChapterId: '04.bin',
          title: 'Lỗi định dạng',
          order: 4,
          access: 'parser_broken',
          error: 'invalid format'
        }
      ],
      existingChapters: [
        { id: 'c1', number: 1, title: 'Chương 1' },
        { id: 'c2', number: 2, title: 'Chương 2' }
      ]
    })

    expect(preview.totalCount).toBe(4)
    expect(preview.matchedCount).toBe(2)
    expect(preview.unmatchedCount).toBe(1)
    expect(preview.errorCount).toBe(1)

    // DB remains unchanged during preview
    expect(listSourceBindings(db)).toHaveLength(0)
    expect(listCatalogItems(db)).toHaveLength(0)

    // Confirm creates binding and catalog items
    const binding = service.confirm(db, preview.previewId, {
      id: 'b1',
      adapterVersion: '1.0.0',
      languageTag: 'ja',
      label: 'Bản folder raw',
      isPrimary: true,
      now: 1000
    })

    expect(binding.id).toBe('b1')
    expect(listSourceBindings(db)).toHaveLength(1)

    const items = listCatalogItems(db, 'b1')
    expect(items).toHaveLength(3) // 3 valid items inserted, error item skipped
    expect(items.find((i) => i.remoteChapterId === '01.txt')?.chapterId).toBe('c1')
    expect(items.find((i) => i.remoteChapterId === '02.txt')?.chapterId).toBe('c2')
    expect(items.find((i) => i.remoteChapterId === '03.txt')?.chapterId).toBeNull()

    db.close()
  })

  it('normalizes full-width digits and strictly extracts chapter numbers', async () => {
    const { normalizeFullWidthDigits, extractChapterNumber } = await import('./matching')
    expect(normalizeFullWidthDigits('第１０話')).toBe('第10話')
    expect(normalizeFullWidthDigits('０１２３４５６７８９')).toBe('0123456789')

    expect(extractChapterNumber('Chương 10: Khởi hành')).toBe(10)
    expect(extractChapterNumber('第１０話　旅立ち')).toBe(10)
    expect(extractChapterNumber('10話')).toBe(10)
    expect(extractChapterNumber('Chapter 02')).toBe(2)
    expect(extractChapterNumber('003 - Tiêu đề')).toBe(3)
    expect(extractChapterNumber('Hồi 5: Chiến trận')).toBe(5)

    // Negative cases: avoid matching years or quantities without explicit chapter prefix
    expect(extractChapterNumber('2024: Khởi đầu mới')).toBeNull()
    expect(extractChapterNumber('3 cô gái nhỏ')).toBeNull()
    expect(extractChapterNumber('Khởi hành')).toBeNull()
  })

  it('matches sparse chapters correctly even when local position is displaced', async () => {
    const { generateMatchingPreview } = await import('./matching')
    const preview = generateMatchingPreview({
      sourceId: 'adapter.kakuyomu',
      remoteWorkId: 'work-1',
      catalogItems: [
        { remoteChapterId: 'ep1', title: '第１話　始まり', order: 1, access: 'public' },
        { remoteChapterId: 'ep10', title: '第１０話　旅立ち', order: 10, access: 'public' }
      ],
      existingChapters: [
        // Work only has chapter 10 at position 0 (number: 1)
        { id: 'c10', number: 1, title: 'Chương 10: Khởi hành' }
      ]
    })

    expect(preview.matchedCount).toBe(1)
    expect(preview.unmatchedCount).toBe(1)
    const ep1 = preview.items.find((i) => i.remoteChapterId === 'ep1')
    const ep10 = preview.items.find((i) => i.remoteChapterId === 'ep10')
    expect(ep1?.matchedChapterId).toBeNull()
    expect(ep1?.confidence).toBe('unmatched')
    expect(ep10?.matchedChapterId).toBe('c10')
    expect(ep10?.confidence).toBe('high')
  })

  it('falls back to relative order for text-only titles with medium confidence', async () => {
    const { generateMatchingPreview } = await import('./matching')
    const preview = generateMatchingPreview({
      sourceId: 'adapter.kakuyomu',
      remoteWorkId: 'work-2',
      catalogItems: [
        { remoteChapterId: 'ep1', title: '旅立ち', order: 1, access: 'public' },
        { remoteChapterId: 'ep2', title: '再会', order: 2, access: 'public' }
      ],
      existingChapters: [
        { id: 'c1', number: 1, title: 'Khởi hành' },
        { id: 'c2', number: 2, title: 'Tái ngộ' }
      ]
    })

    expect(preview.matchedCount).toBe(2)
    expect(preview.items[0].matchedChapterId).toBe('c1')
    expect(preview.items[0].confidence).toBe('medium')
    expect(preview.items[1].matchedChapterId).toBe('c2')
    expect(preview.items[1].confidence).toBe('medium')
  })
})
