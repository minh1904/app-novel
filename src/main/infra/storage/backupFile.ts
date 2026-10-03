import { renameSync, rmSync } from 'node:fs'
import { StorageError, toStorageError } from './errors'
import { latestVersion, readPragmas } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { WORK_APPLICATION_ID, workSchema } from './workSchema'

/**
 * Backup is a consistent copy of a work file (`VACUUM INTO`), so a backup is itself a valid `.mira`
 * file and there is no second format to maintain. Both directions check a file before trusting it.
 */

// Tables every version of the work file has had since version 1.
const REQUIRED_TABLES = [
  'work',
  'chapter',
  'chapter_text',
  'segment',
  'link',
  'link_member',
  'provenance'
]

const NOT_MIRA = 'Tệp này không phải bản sao lưu của Mira, hoặc đã bị hỏng.'

function removeSideFiles(path: string): void {
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(path + suffix, { force: true })
}

/**
 * Checks a work file without changing its content. The application id comes first, so a file that
 * is not Mira's is turned away before any other statement runs on it. Works on a copy the app owns.
 */
export function verifyWorkFile(path: string): void {
  let db: Db
  try {
    db = openDatabase(path)
  } catch {
    throw new StorageError('corrupt', NOT_MIRA)
  }
  try {
    const { applicationId, userVersion } = readPragmas(db)
    if (applicationId !== WORK_APPLICATION_ID) throw new StorageError('corrupt', NOT_MIRA)
    const latest = latestVersion(workSchema)
    if (userVersion > latest) {
      throw new StorageError(
        'unsupported_version',
        'Bản sao lưu được tạo bởi phiên bản Mira mới hơn (schema ' +
          userVersion +
          ', bản này hiểu tới ' +
          latest +
          '). Hãy cập nhật Mira rồi thử lại.'
      )
    }

    const integrity = db.prepare('PRAGMA integrity_check').all<{ integrity_check: string }>()
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
      throw new StorageError('corrupt', 'Bản sao lưu bị hỏng dữ liệu.')
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length > 0) {
      throw new StorageError('corrupt', 'Bản sao lưu có liên kết dữ liệu không hợp lệ.')
    }
    const tables = new Set(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all<{ name: string }>()
        .map((row) => row.name)
    )
    for (const table of REQUIRED_TABLES) {
      if (!tables.has(table)) throw new StorageError('corrupt', NOT_MIRA)
    }
    const works = db.prepare('SELECT count(*) AS n FROM work').get<{ n: number }>()
    if (works?.n !== 1) throw new StorageError('corrupt', 'Bản sao lưu không có đúng một tác phẩm.')
  } catch (error) {
    throw toStorageError(error)
  } finally {
    db.close()
  }
}

/**
 * Writes a consistent snapshot of the open work to `destination`: into `<destination>.part` first,
 * checked, then renamed, so the destination is either the finished backup or untouched.
 */
export function exportToFile(db: Db, destination: string): void {
  const part = destination + '.part'
  removeSideFiles(part)
  try {
    db.exec("VACUUM INTO '" + part.replace(/'/g, "''") + "'")
    verifyWorkFile(part)
    // Closing the checking connection normally removes these; make sure none travels with the file.
    for (const suffix of ['-journal', '-wal', '-shm']) rmSync(part + suffix, { force: true })
    renameSync(part, destination)
  } catch (error) {
    removeSideFiles(part)
    throw toStorageError(error)
  }
}
