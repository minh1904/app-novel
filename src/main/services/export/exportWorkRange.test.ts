import { describe, expect, it, vi } from 'vitest'
import type { ExportProgress } from '../../../shared/contracts/export'
import type { LibraryStore } from '../library/library'
import { ExportService, numberWidth } from './exportService'
import type { ExportFilePicker, PdfPrinter } from './exportTypes'

/** A work of `count` chapters; the ones in `empty` have no translation. */
function setup(count: number, empty: number[] = []) {
  const chapters = Array.from({ length: count }, (_, index) => ({
    id: 'c' + (index + 1),
    number: index + 1,
    title: 'Tên ' + (index + 1)
  }))
  const library = {
    get: vi.fn().mockReturnValue({ id: 'w1', title: 'Truyện', author: 'A' }),
    listChapters: vi.fn().mockReturnValue(chapters),
    readText: vi.fn().mockImplementation((_workId: string, chapterId: string) => ({
      content: empty.includes(Number(chapterId.slice(1))) ? '  ' : 'Chữ ' + chapterId
    }))
  } as unknown as LibraryStore
  const picker: ExportFilePicker = {
    chooseExportSavePath: vi.fn().mockResolvedValue('/out/truyen.txt'),
    chooseExportDirectory: vi.fn().mockResolvedValue('/out/dir')
  }
  const printer: PdfPrinter = { renderToPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }
  const paths: string[] = []
  const write = vi.fn().mockImplementation((path: string) => {
    paths.push(path)
    return Promise.resolve()
  })
  const revealed: string[] = []
  const service = new ExportService(library, picker, printer, write, (path) => revealed.push(path))
  return { service, paths, revealed }
}

describe('exportWork over a range', () => {
  it('pads file numbers to the widest chapter number, at least three digits', async () => {
    expect(numberWidth(12)).toBe(3)
    expect(numberWidth(1200)).toBe(4)
    const { service, paths } = setup(1000)
    await service.exportWork({
      workId: 'w1',
      chapterIds: ['c7'],
      format: 'txt',
      mode: 'separate'
    })
    expect(paths.map((path) => path.replace(/\\/g, '/'))).toEqual(['/out/dir/0007 - Tên 7.txt'])
  })

  it('counts the chapters left out for having no translation', async () => {
    const { service } = setup(5, [2, 4])
    const result = await service.exportWork({ workId: 'w1', format: 'txt', mode: 'combined' })
    expect(result).toMatchObject({ success: true, count: 3, skipped: 2 })
  })

  it('reports progress after each chapter and stops when cancelled', async () => {
    const { service, paths } = setup(4)
    const seen: ExportProgress[] = []
    const result = await service.exportWork(
      { workId: 'w1', format: 'txt', mode: 'separate' },
      (progress) => {
        seen.push(progress)
        if (progress.done === 2) service.cancel('w1')
      }
    )
    expect(seen.map((progress) => progress.done)).toEqual([0, 1, 2])
    expect(paths).toHaveLength(2)
    expect(result).toMatchObject({ success: false, canceled: true, count: 2 })
  })

  it('reveals only what it has written', async () => {
    const { service, revealed } = setup(2)
    expect(service.reveal('/out/truyen.txt')).toBe(false)
    await service.exportWork({ workId: 'w1', format: 'txt', mode: 'combined' })
    expect(service.reveal('/out/truyen.txt')).toBe(true)
    expect(revealed).toEqual(['/out/truyen.txt'])
  })
})
