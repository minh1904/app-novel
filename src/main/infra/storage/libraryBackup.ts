import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { StorageError, toStorageError } from './errors'
import { LIBRARY_APPLICATION_ID } from './librarySchema'
import { readPragmas } from './migrate'
import { openDatabase, type Db } from './sqlite'

/**
 * Lifecycle and local backup helpers for `library.db`.
 *
 * `library.db` contains app-level data (connections, models, sources, agent sessions)
 * and cannot be treated as a dispensable cache. Before migrations, a full-file backup
 * is created via SQLite's backup mechanism (`VACUUM INTO`) to a temporary `.part` file,
 * verified for schema integrity, and published only when verified. If `library.db` is
 * corrupt, startup restores the latest valid backup instead of silently recreating a blank DB.
 */

export function removeSideFiles(path: string): void {
  for (const suffix of ['-journal', '-wal', '-shm']) rmSync(path + suffix, { force: true })
}

export function deleteDatabaseFile(path: string): void {
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(path + suffix, { force: true })
}

/**
 * Verifies that a file is a readable, uncorrupted Mira library database.
 * Does not modify the file.
 */
export function verifyLibraryDatabase(path: string): void {
  let db: Db
  try {
    db = openDatabase(path, { readOnly: true })
  } catch (error) {
    throw new StorageError('corrupt', 'Tệp này không phải cơ sở dữ liệu Mira, hoặc đã bị hỏng.', {
      cause: error
    })
  }
  try {
    const { applicationId, userVersion } = readPragmas(db)
    if (applicationId !== LIBRARY_APPLICATION_ID) {
      throw new StorageError('corrupt', 'Tệp không phải cơ sở dữ liệu thư viện Mira.')
    }
    if (userVersion <= 0) {
      throw new StorageError('corrupt', 'Cơ sở dữ liệu thư viện chưa có phiên bản hợp lệ.')
    }

    const integrity = db.prepare('PRAGMA integrity_check').all<{ integrity_check: string }>()
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
      throw new StorageError('corrupt', 'Cơ sở dữ liệu thư viện bị hỏng dữ liệu.')
    }

    if (db.prepare('PRAGMA foreign_key_check').all().length > 0) {
      throw new StorageError('corrupt', 'Cơ sở dữ liệu thư viện có liên kết dữ liệu không hợp lệ.')
    }

    const tables = new Set(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all<{ name: string }>()
        .map((row) => row.name)
    )
    if (!tables.has('work_index') || !tables.has('meta')) {
      throw new StorageError('corrupt', 'Cơ sở dữ liệu thư viện thiếu bảng bắt buộc.')
    }
  } catch (error) {
    throw toStorageError(error)
  } finally {
    db.close()
  }
}

/**
 * Creates a verified backup of an open library database.
 * Writes to `<destination>.part` first, verifies it, then atomically renames to `<destination>`.
 */
export function createLibraryBackup(db: Db, destination: string): void {
  const part = destination + '.part'
  mkdirSync(dirname(destination), { recursive: true })
  deleteDatabaseFile(part)
  try {
    db.exec("VACUUM INTO '" + part.replace(/'/g, "''") + "'")
    verifyLibraryDatabase(part)
    deleteDatabaseFile(destination)
    renameSync(part, destination)
  } catch (error) {
    deleteDatabaseFile(part)
    throw toStorageError(error)
  }
}

/**
 * Finds the latest valid library backup in the given directory.
 * Returns null if no valid backup exists.
 */
export function findLatestValidLibraryBackup(dir: string): string | null {
  if (!existsSync(dir)) return null
  try {
    const entries = readdirSync(dir)
    const candidates = entries
      .filter(
        (name) =>
          name !== 'library.db' &&
          name.endsWith('.db') &&
          !name.endsWith('.part') &&
          !name.includes('.part.')
      )
      .map((name) => join(dir, name))
      .sort((a, b) => {
        try {
          return statSync(b).mtimeMs - statSync(a).mtimeMs
        } catch {
          return b.localeCompare(a)
        }
      })

    for (const candidate of candidates) {
      try {
        verifyLibraryDatabase(candidate)
        return candidate
      } catch {
        // Candidate is invalid or corrupt, try next older backup
      }
    }
  } catch {
    return null
  }
  return null
}
