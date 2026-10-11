import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { StorageError } from './errors'
import {
  createLibraryBackup,
  findLatestValidLibraryBackup,
  removeSideFiles,
  verifyLibraryDatabase
} from './libraryBackup'
import { LIBRARY_APPLICATION_ID, librarySchema } from './librarySchema'
import { latestVersion, migrate, readPragmas, type SchemaSpec } from './migrate'
import { openDatabase, type Db } from './sqlite'
import { insertWork } from './workFile'
import { WorkFiles } from './workFiles'
import { workSchema } from './workSchema'

const tempDir = createTempDirs()
const dbs: Db[] = []
const workFilesList: WorkFiles[] = []

afterEach(() => {
  for (const wf of workFilesList.splice(0)) {
    try {
      wf.index.close()
    } catch {
      // ignore
    }
  }
  for (const db of dbs.splice(0)) {
    try {
      db.close()
    } catch {
      // ignore
    }
  }
})

function openWorkFiles(dataDir: string, now = () => 1000): WorkFiles {
  const files = WorkFiles.open({ dataDir, now })
  workFilesList.push(files)
  return files
}

function open(path: string): Db {
  const db = openDatabase(path)
  dbs.push(db)
  return db
}

function createSampleLibraryDb(dir: string, version = 9): { path: string; db: Db } {
  const path = join(dir, 'library.db')
  const db = open(path)
  const upToVersion: SchemaSpec = {
    applicationId: librarySchema.applicationId,
    migrations: librarySchema.migrations.filter((m) => m.version <= version)
  }
  migrate(db, upToVersion)
  return { path, db }
}

describe('libraryBackup — verification and backup creation', () => {
  it('verifyLibraryDatabase passes on a valid library database', () => {
    const dir = tempDir()
    const { path, db } = createSampleLibraryDb(dir)
    db.close()

    expect(() => verifyLibraryDatabase(path)).not.toThrow()
  })

  it('verifyLibraryDatabase rejects non-database files and empty files', () => {
    const dir = tempDir()
    const garbagePath = join(dir, 'garbage.db')
    writeFileSync(garbagePath, 'not a sqlite database')
    expect(() => verifyLibraryDatabase(garbagePath)).toThrow(StorageError)

    const emptyPath = join(dir, 'empty.db')
    writeFileSync(emptyPath, '')
    expect(() => verifyLibraryDatabase(emptyPath)).toThrow(StorageError)
  })

  it('verifyLibraryDatabase rejects a database with wrong applicationId (e.g. work file)', () => {
    const dir = tempDir()
    const workPath = join(dir, 'test.mira')
    const db = open(workPath)
    migrate(db, workSchema)
    db.close()

    expect(() => verifyLibraryDatabase(workPath)).toThrow(/không phải cơ sở dữ liệu thư viện Mira/)
  })

  it('verifyLibraryDatabase rejects a database missing required tables', () => {
    const dir = tempDir()
    const path = join(dir, 'custom.db')
    const db = open(path)
    db.exec(
      `PRAGMA application_id = ${LIBRARY_APPLICATION_ID}; PRAGMA user_version = 1; CREATE TABLE other (id TEXT);`
    )
    db.close()

    expect(() => verifyLibraryDatabase(path)).toThrow(/thiếu bảng bắt buộc/)
  })

  it('createLibraryBackup creates a valid backup and removes .part file', () => {
    const dir = tempDir()
    const { db } = createSampleLibraryDb(dir)
    const backupPath = join(dir, 'backups', 'library-backup-1.db')

    createLibraryBackup(db, backupPath)
    db.close()

    expect(existsSync(backupPath)).toBe(true)
    expect(existsSync(backupPath + '.part')).toBe(false)
    expect(() => verifyLibraryDatabase(backupPath)).not.toThrow()
  })

  it('createLibraryBackup cleans up .part and does not publish if temporary backup is corrupt', () => {
    const dir = tempDir()
    const path = join(dir, 'library.db')
    const db = open(path)
    // Create an unmigrated database with no application_id or tables
    const backupPath = join(dir, 'backups', 'library-backup-bad.db')

    // VACUUM INTO of an empty db will fail verifyLibraryDatabase (user_version = 0, missing tables)
    expect(() => createLibraryBackup(db, backupPath)).toThrow(StorageError)
    db.close()

    expect(existsSync(backupPath)).toBe(false)
    expect(existsSync(backupPath + '.part')).toBe(false)
  })
})

describe('libraryBackup — finding latest valid backup', () => {
  it('findLatestValidLibraryBackup returns the newest valid backup and ignores .part files', () => {
    const dir = tempDir()
    const backupsDir = join(dir, 'backups')
    mkdirSync(backupsDir, { recursive: true })

    const { db } = createSampleLibraryDb(dir)
    const backup1 = join(backupsDir, 'library-backup-100.db')
    const backup2 = join(backupsDir, 'library-backup-200.db')
    createLibraryBackup(db, backup1)
    createLibraryBackup(db, backup2)
    db.close()

    // Add a dangling .part file from an interrupted run
    writeFileSync(join(backupsDir, 'library-backup-300.db.part'), 'incomplete write')

    const latest = findLatestValidLibraryBackup(backupsDir)
    expect(latest).toBe(backup2)
  })

  it('findLatestValidLibraryBackup skips a corrupt newest backup and falls back to older valid backup', () => {
    const dir = tempDir()
    const backupsDir = join(dir, 'backups')
    mkdirSync(backupsDir, { recursive: true })

    const { db } = createSampleLibraryDb(dir)
    const backup1 = join(backupsDir, 'library-backup-100.db')
    const backup2 = join(backupsDir, 'library-backup-200.db')
    createLibraryBackup(db, backup1)
    createLibraryBackup(db, backup2)
    db.close()

    // Corrupt the newer backup
    writeFileSync(backup2, 'corrupt data')

    const latest = findLatestValidLibraryBackup(backupsDir)
    expect(latest).toBe(backup1)
  })

  it('findLatestValidLibraryBackup returns null when no valid backup exists', () => {
    const dir = tempDir()
    const backupsDir = join(dir, 'backups')
    mkdirSync(backupsDir, { recursive: true })

    writeFileSync(join(backupsDir, 'library-backup-100.db'), 'corrupted')
    writeFileSync(join(backupsDir, 'library-backup-200.db.part'), 'unfinished')

    expect(findLatestValidLibraryBackup(backupsDir)).toBeNull()
  })
})

describe('WorkFiles library.db lifecycle', () => {
  it('creates a verified pre-migration backup before upgrading library.db', () => {
    const dir = tempDir()
    const backupsDir = join(dir, 'backups')

    // Create a v8 library database
    const { db } = createSampleLibraryDb(dir, 8)
    db.prepare(
      'INSERT INTO ai_connection (id, name, base_url, enabled, ord, created_at, updated_at) VALUES (?, ?, ?, 1, 0, 100, 100)'
    ).run('conn-1', 'AI Provider', 'https://api.example.com')
    db.close()

    expect(existsSync(backupsDir)).toBe(false)

    // Open via WorkFiles — should detect userVersion 8 < 9, create backup, then migrate to 9
    const files = WorkFiles.open({ dataDir: dir, now: () => 1500 })
    expect(readPragmas(files.index).userVersion).toBe(9)

    // Verify backup exists in backups/
    const backups = readdirSync(backupsDir).filter((f) => f.endsWith('.db'))
    expect(backups.length).toBeGreaterThan(0)
    const backupFile = join(backupsDir, backups[0])
    expect(() => verifyLibraryDatabase(backupFile)).not.toThrow()

    // Backup is at schema version 8 with our connection preserved
    const bakDb = open(backupFile)
    expect(readPragmas(bakDb).userVersion).toBe(8)
    const row = bakDb
      .prepare('SELECT id, name FROM ai_connection')
      .get<{ id: string; name: string }>()
    expect(row).toEqual({ id: 'conn-1', name: 'AI Provider' })
    bakDb.close()

    files.index.close()
  })

  it('preserves pre-migration backup if migration fails', () => {
    const dir = tempDir()
    const backupsDir = join(dir, 'backups')

    // Create v8 database
    const { db } = createSampleLibraryDb(dir, 8)
    db.close()

    // An invalid migration schema that fails during up()
    const brokenSchema: SchemaSpec = {
      applicationId: LIBRARY_APPLICATION_ID,
      migrations: [
        ...librarySchema.migrations.filter((m) => m.version <= 8),
        {
          version: 9,
          up() {
            throw new Error('Migration failure simulation')
          }
        }
      ]
    }

    // Attempting open with broken migration fails
    const dbOpen = open(join(dir, 'library.db'))
    expect(() => {
      try {
        const { userVersion } = readPragmas(dbOpen)
        if (userVersion > 0 && userVersion < latestVersion(brokenSchema)) {
          mkdirSync(backupsDir, { recursive: true })
          createLibraryBackup(dbOpen, join(backupsDir, 'library-backup-pre.db'))
        }
        migrate(dbOpen, brokenSchema)
      } finally {
        dbOpen.close()
      }
    }).toThrow(/Migration failure simulation/)

    // Pre-migration backup exists and is valid on disk!
    expect(existsSync(join(backupsDir, 'library-backup-pre.db'))).toBe(true)
    expect(() => verifyLibraryDatabase(join(backupsDir, 'library-backup-pre.db'))).not.toThrow()
  })

  it('restores corrupt library.db from latest valid backup and preserves agent/connection/source rows', () => {
    const dir = tempDir()
    const files = openWorkFiles(dir, () => 1000)
    const workId = '00000000-0000-0000-0000-000000000001'

    // Add work
    files.createWorkFile(workId, (workDb) => {
      insertWork(workDb, workId, { title: 'Tác phẩm Alpha', sourceLang: 'ja' }, 1000)
      return undefined
    })

    // Add app-level records
    files.index
      .prepare(
        'INSERT INTO ai_connection (id, name, base_url, enabled, ord, created_at, updated_at) VALUES (?, ?, ?, 1, 0, 1000, 1000)'
      )
      .run('conn-1', 'Claude', 'https://api.anthropic.com')
    files.index
      .prepare(
        'INSERT INTO agent_session (id, title, created_at, updated_at) VALUES (?, ?, 1000, 1000)'
      )
      .run('sess-1', 'Phiên dịch chương 1')
    files.index
      .prepare(
        'INSERT INTO source_job (id, work_id, binding_id, kind, state, attempt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 1000, 1000)'
      )
      .run('job-1', workId, 'bind-1', 'crawl', 'queued')

    // Take backup
    mkdirSync(join(dir, 'backups'), { recursive: true })
    createLibraryBackup(files.index, join(dir, 'backups', 'library-backup-1000.db'))
    files.index.close()

    // Corrupt library.db
    removeSideFiles(join(dir, 'library.db'))
    writeFileSync(join(dir, 'library.db'), 'corrupted garbage bytes')

    // Reopen WorkFiles — should recover from backup
    const recoveredFiles = openWorkFiles(dir, () => 2000)
    expect(recoveredFiles.list().works.map((w) => w.id)).toEqual([workId])

    // Assert agent, connection, source rows are preserved
    const conn = recoveredFiles.index
      .prepare('SELECT id, name FROM ai_connection WHERE id = ?')
      .get<{ id: string; name: string }>('conn-1')
    expect(conn?.name).toBe('Claude')

    const sess = recoveredFiles.index
      .prepare('SELECT id, title FROM agent_session WHERE id = ?')
      .get<{ id: string; title: string }>('sess-1')
    expect(sess?.title).toBe('Phiên dịch chương 1')

    const job = recoveredFiles.index
      .prepare('SELECT id, kind FROM source_job WHERE id = ?')
      .get<{ id: string; kind: string }>('job-1')
    expect(job?.kind).toBe('crawl')

    // Corrupt DB was moved to .corrupt-2000
    expect(existsSync(join(dir, 'library.db.corrupt-2000'))).toBe(true)

    recoveredFiles.index.close()
  })

  it('refuses corrupt library.db with recovery error and does not silently recreate when no backup exists', () => {
    const dir = tempDir()
    const files = openWorkFiles(dir, () => 1000)
    const workId = '00000000-0000-0000-0000-000000000002'
    files.createWorkFile(workId, (workDb) => {
      insertWork(workDb, workId, { title: 'Tác phẩm Beta', sourceLang: 'en' }, 1000)
      return undefined
    })
    files.index.close()

    // Corrupt library.db without any backup
    removeSideFiles(join(dir, 'library.db'))
    writeFileSync(join(dir, 'library.db'), 'completely corrupted')

    expect(() => openWorkFiles(dir, () => 2000)).toThrow(
      /không tìm thấy bản sao lưu hợp lệ để khôi phục/
    )

    // Does NOT silently rename to .corrupt or recreate empty library.db
    expect(readdirSync(dir).some((n) => n.startsWith('library.db.corrupt-'))).toBe(false)
    expect(readFileSync(join(dir, 'library.db'), 'utf-8')).toBe('completely corrupted')
  })

  it('ignores interrupted backup .part files and cleans them during reconcile', () => {
    const dir = tempDir()
    const files = openWorkFiles(dir, () => 1000)
    files.index.close()

    // Simulate interrupted backup leaving a .part file in backups/
    const backupsDir = join(dir, 'backups')
    mkdirSync(backupsDir, { recursive: true })
    const partPath = join(backupsDir, 'library-backup-unfinished.db.part')
    writeFileSync(partPath, 'half-written backup')

    // Starting WorkFiles cleans up the leftover .part file
    const files2 = openWorkFiles(dir, () => 2000)
    expect(existsSync(partPath)).toBe(false)
    files2.index.close()
  })

  it('reconcile rebuilds lost work_index projection without touching agent, connection, or source rows', () => {
    const dir = tempDir()
    const files = openWorkFiles(dir, () => 1000)
    const workId = '00000000-0000-0000-0000-000000000003'

    files.createWorkFile(workId, (workDb) => {
      insertWork(workDb, workId, { title: 'Tác phẩm Gamma', sourceLang: 'zh' }, 1000)
      return undefined
    })

    // Populate app-level data
    files.index
      .prepare(
        'INSERT INTO ai_connection (id, name, base_url, enabled, ord, created_at, updated_at) VALUES (?, ?, ?, 1, 0, 1000, 1000)'
      )
      .run('conn-g', 'Gemini', 'https://generativelanguage.googleapis.com')
    files.index
      .prepare(
        'INSERT INTO agent_session (id, title, created_at, updated_at) VALUES (?, ?, 1000, 1000)'
      )
      .run('sess-g', 'Phiên dịch Gamma')
    files.index
      .prepare(
        'INSERT INTO source_job (id, work_id, binding_id, kind, state, attempt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 1000, 1000)'
      )
      .run('job-g', workId, 'bind-g', 'sync', 'queued')

    // Projection lost: work_index is completely deleted
    files.index.exec('DELETE FROM work_index')
    expect(
      files.index.prepare('SELECT count(*) as count FROM work_index').get<{ count: number }>()
        ?.count
    ).toBe(0)
    files.index.close()

    // Reopen WorkFiles — reconcile must rebuild work_index projection from works/*.mira
    const filesReconciled = openWorkFiles(dir, () => 2000)
    const list = filesReconciled.list()
    expect(list.works.map((w) => w.id)).toEqual([workId])
    expect(list.works[0].title).toBe('Tác phẩm Gamma')

    // All app-level rows must be strictly preserved!
    const conn = filesReconciled.index
      .prepare('SELECT id, name FROM ai_connection WHERE id = ?')
      .get<{ id: string; name: string }>('conn-g')
    expect(conn?.name).toBe('Gemini')

    const sess = filesReconciled.index
      .prepare('SELECT id, title FROM agent_session WHERE id = ?')
      .get<{ id: string; title: string }>('sess-g')
    expect(sess?.title).toBe('Phiên dịch Gamma')

    const job = filesReconciled.index
      .prepare('SELECT id, kind FROM source_job WHERE id = ?')
      .get<{ id: string; kind: string }>('job-g')
    expect(job?.kind).toBe('sync')

    filesReconciled.index.close()
  })
})
