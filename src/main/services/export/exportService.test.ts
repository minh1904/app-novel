import { describe, expect, it, vi } from 'vitest'
import { ExportService, sanitizeFilename } from './exportService'
import type { ExportFilePicker, PdfPrinter } from './exportTypes'
import type { LibraryStore } from '../library/library'

describe('ExportService', () => {
  it('sanitizes unsafe filename characters', () => {
    expect(sanitizeFilename('Truyện: "Cuộc Phiêu Lưu"? / Phần 1*')).toBe(
      'Truyện_ _Cuộc Phiêu Lưu__ _ Phần 1_'
    )
    expect(sanitizeFilename('   ')).toBe('novel')
  })

  it('exports single chapter successfully', async () => {
    const mockLibrary = {
      get: vi.fn().mockReturnValue({
        id: 'w1',
        title: 'Bộ Truyện Tuyệt Vời',
        author: 'Tác Giả A'
      }),
      listChapters: vi.fn().mockReturnValue([{ id: 'c1', number: 1, title: 'Khởi đầu' }]),
      readText: vi.fn().mockReturnValue({
        content: 'Nội dung dịch chương 1.'
      })
    } as unknown as LibraryStore

    const mockPicker: ExportFilePicker = {
      chooseExportSavePath: vi.fn().mockResolvedValue('/tmp/test-export.txt'),
      chooseExportDirectory: vi.fn().mockResolvedValue('/tmp/export-dir')
    }

    const mockPdfPrinter: PdfPrinter = {
      renderToPdf: vi.fn().mockResolvedValue(Buffer.from('mock pdf'))
    }

    const writtenFiles: { path: string; data: Buffer }[] = []
    const mockWriteBuffer = vi.fn().mockImplementation((path: string, data: Buffer) => {
      writtenFiles.push({ path, data })
      return Promise.resolve()
    })

    const service = new ExportService(mockLibrary, mockPicker, mockPdfPrinter, mockWriteBuffer)

    const result = await service.exportChapter({
      workId: 'w1',
      chapterId: 'c1',
      format: 'txt'
    })

    expect(result.success).toBe(true)
    expect(result.filePath).toBe('/tmp/test-export.txt')
    expect(result.count).toBe(1)
    expect(mockWriteBuffer).toHaveBeenCalledTimes(1)
    expect(writtenFiles[0].path).toBe('/tmp/test-export.txt')
    expect(writtenFiles[0].data.toString('utf-8')).toContain('Chương 1: Khởi đầu')
  })

  it('exports whole work in combined mode', async () => {
    const mockLibrary = {
      get: vi.fn().mockReturnValue({
        id: 'w1',
        title: 'Bộ Truyện Tuyệt Vời',
        author: 'Tác Giả A'
      }),
      listChapters: vi.fn().mockReturnValue([
        { id: 'c1', number: 1, title: 'C1' },
        { id: 'c2', number: 2, title: 'C2' }
      ]),
      readText: vi.fn().mockImplementation((_wId, chId) => ({
        content: chId === 'c1' ? 'Chữ C1' : 'Chữ C2'
      }))
    } as unknown as LibraryStore

    const mockPicker: ExportFilePicker = {
      chooseExportSavePath: vi.fn().mockResolvedValue('/tmp/combined.md'),
      chooseExportDirectory: vi.fn().mockResolvedValue('/tmp/dir')
    }

    const mockPdfPrinter: PdfPrinter = {
      renderToPdf: vi.fn().mockResolvedValue(Buffer.from('mock pdf'))
    }

    const mockWriteBuffer = vi.fn().mockResolvedValue(undefined)

    const service = new ExportService(mockLibrary, mockPicker, mockPdfPrinter, mockWriteBuffer)

    const result = await service.exportWork({
      workId: 'w1',
      format: 'md',
      mode: 'combined'
    })

    expect(result.success).toBe(true)
    expect(result.count).toBe(2)
    expect(mockWriteBuffer).toHaveBeenCalledWith('/tmp/combined.md', expect.any(Buffer))
  })

  it('handles user cancellation in save dialog', async () => {
    const mockLibrary = {
      get: vi.fn().mockReturnValue({ id: 'w1', title: 'Truyện' }),
      listChapters: vi.fn().mockReturnValue([{ id: 'c1', number: 1, title: 'C1' }]),
      readText: vi.fn().mockReturnValue({ content: 'Chữ' })
    } as unknown as LibraryStore

    const mockPicker: ExportFilePicker = {
      chooseExportSavePath: vi.fn().mockResolvedValue(null),
      chooseExportDirectory: vi.fn().mockResolvedValue(null)
    }

    const mockPdfPrinter: PdfPrinter = {
      renderToPdf: vi.fn()
    }

    const service = new ExportService(mockLibrary, mockPicker, mockPdfPrinter)

    const result = await service.exportChapter({
      workId: 'w1',
      chapterId: 'c1',
      format: 'docx'
    })

    expect(result.success).toBe(false)
    expect(result.canceled).toBe(true)
  })
})
