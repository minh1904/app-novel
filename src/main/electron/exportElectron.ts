import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'node:path'
import type { ExportFilePicker, PdfPrinter } from '../services/export/exportTypes'

const FORMAT_FILTERS: Record<string, { name: string; extensions: string[] }> = {
  txt: { name: 'Văn bản thuần (.txt)', extensions: ['txt'] },
  md: { name: 'Tài liệu Markdown (.md)', extensions: ['md'] },
  docx: { name: 'Tài liệu Word (.docx)', extensions: ['docx'] },
  pdf: { name: 'Tài liệu PDF (.pdf)', extensions: ['pdf'] }
}

export function electronExportFilePicker(): ExportFilePicker {
  const parent = (): BrowserWindow | undefined =>
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]

  return {
    async chooseExportSavePath(suggestedName: string, extension: string): Promise<string | null> {
      const filter = FORMAT_FILTERS[extension] ?? {
        name: `${extension.toUpperCase()} File`,
        extensions: [extension]
      }
      const options = {
        title: 'Xuất tệp',
        defaultPath: join(app.getPath('documents'), suggestedName),
        filters: [filter]
      }
      const win = parent()
      const result = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options)
      return result.canceled || !result.filePath ? null : result.filePath
    },

    async chooseExportDirectory(): Promise<string | null> {
      const options = {
        title: 'Chọn thư mục lưu các chương',
        properties: ['openDirectory' as const, 'createDirectory' as const]
      }
      const win = parent()
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options)
      return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
    }
  }
}

export function electronPdfPrinter(): PdfPrinter {
  return {
    async renderToPdf(html: string, options?: { pageSize?: 'A4' | 'A5' }): Promise<Buffer> {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true,
          contextIsolation: true
        }
      })

      try {
        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
        const pdfBuffer = await win.webContents.printToPDF({
          pageSize: options?.pageSize === 'A4' ? 'A4' : 'A5',
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        })
        return pdfBuffer
      } finally {
        win.destroy()
      }
    }
  }
}
