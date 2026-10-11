// Kiểm thử thực tế (smoke test): node:sqlite phải hoạt động được bên trong tiến trình chính của Electron.
// Chạy bằng `pnpm smoke:sqlite` sau mỗi lần nâng cấp Electron.
import { app } from 'electron'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)

function check(condition, message) {
  if (!condition) throw new Error(message)
}

app.whenReady().then(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-smoke-'))
  let code = 0
  try {
    const { DatabaseSync, backup } = require('node:sqlite')
    const db = new DatabaseSync(path.join(dir, 'smoke.db'))

    check(db.prepare('PRAGMA journal_mode=WAL').get().journal_mode === 'wal', 'WAL not enabled')
    db.exec('PRAGMA synchronous=FULL')
    db.exec('PRAGMA foreign_keys=ON')
    db.exec('CREATE TABLE t(a TEXT)')

    const text = 'xin chào 你好 こんにちは'
    db.prepare('INSERT INTO t VALUES (?)').run(text)
    check(db.prepare('SELECT a FROM t').get().a === text, 'Unicode round trip failed')

    const copy = path.join(dir, 'copy.db')
    db.prepare('VACUUM INTO ?').run(copy)
    check(fs.existsSync(copy), 'VACUUM INTO did not create a file')
    check(typeof backup === 'function', 'backup() is missing')

    const version = db.prepare('SELECT sqlite_version() AS v').get().v
    db.close()
    console.log(
      'smoke ok: electron ' +
        process.versions.electron +
        ', node ' +
        process.versions.node +
        ', sqlite ' +
        version
    )
  } catch (error) {
    console.error('smoke FAILED: ' + error.message)
    code = 1
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
    app.exit(code)
  }
})
