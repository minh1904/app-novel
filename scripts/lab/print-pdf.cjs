// In các trang HTML ra PDF bằng Chromium của Electron, cùng `printToPDF` mà module Xuất của app dùng.
//   electron scripts/lab/print-pdf.cjs <a.html> <a.pdf> [<b.html> <b.pdf> …]
// Nạp bằng tệp chứ không bằng data: URL, vì một truyện dịch đủ vượt giới hạn 2 MB của data: URL.
// Dùng **một** cửa sổ cho mọi trang: cửa sổ thứ hai tạo sau khi hủy cửa sổ đầu nạp tệp lỗi ERR_FAILED.
const { app, BrowserWindow } = require('electron')
const { writeFileSync } = require('node:fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const pairs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true }
  })
  let failed = false
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const [html, pdf] = [pairs[i], pairs[i + 1]]
    try {
      await win.loadFile(html)
      const buffer = await win.webContents.printToPDF({
        pageSize: 'A5',
        printBackground: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      })
      writeFileSync(pdf, buffer)
      console.log('PDF ' + pdf)
    } catch (error) {
      failed = true
      console.error('Lỗi in ' + html + ': ' + (error && error.message ? error.message : error))
    }
  }
  win.destroy()
  app.exit(failed ? 1 : 0)
})
