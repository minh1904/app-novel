import { DatabaseSync, type StatementSync } from 'node:sqlite'

/**
 * The only module that touches the SQLite engine. Everything else uses this small surface, so the
 * engine can be swapped (see ADR-003) without touching repositories.
 */

export type SqlValue = string | number | bigint | null | Uint8Array
export type SqlParams = SqlValue[]

export interface RunResult {
  changes: number
}

export interface Statement {
  run(...params: SqlParams): RunResult
  get<T>(...params: SqlParams): T | undefined
  all<T>(...params: SqlParams): T[]
}

export interface Db {
  readonly path: string
  exec(sql: string): void
  prepare(sql: string): Statement
  /**
   * Runs `fn` atomically. The outermost call opens `BEGIN IMMEDIATE`; nested calls use savepoints so
   * an inner failure can roll back alone. `fn` must be synchronous.
   */
  transaction<T>(fn: () => T): T
  close(): void
}

export interface OpenOptions {
  /** Open without creating the file or writing to it. */
  readOnly?: boolean
}

const BUSY_TIMEOUT_MS = 5000

class SqliteDb implements Db {
  readonly path: string
  private readonly db: DatabaseSync
  private depth = 0
  private closed = false

  constructor(path: string, options: OpenOptions) {
    this.path = path
    this.db = new DatabaseSync(path, { readOnly: options.readOnly ?? false })
    try {
      this.db.exec('PRAGMA busy_timeout = ' + BUSY_TIMEOUT_MS)
      if (!options.readOnly) {
        this.db.exec('PRAGMA journal_mode = WAL')
        this.db.exec('PRAGMA synchronous = FULL')
      }
      this.db.exec('PRAGMA foreign_keys = ON')
    } catch (error) {
      // A file that is not a database fails here; release the handle or Windows keeps it locked.
      this.closed = true
      this.db.close()
      throw error
    }
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  prepare(sql: string): Statement {
    const statement: StatementSync = this.db.prepare(sql)
    return {
      run: (...params) => {
        const result = statement.run(...params)
        return { changes: Number(result.changes) }
      },
      get: <T>(...params: SqlParams) => statement.get(...params) as T | undefined,
      all: <T>(...params: SqlParams) => statement.all(...params) as T[]
    }
  }

  transaction<T>(fn: () => T): T {
    const outermost = this.depth === 0
    const savepoint = 'mira_sp_' + this.depth
    this.db.exec(outermost ? 'BEGIN IMMEDIATE' : 'SAVEPOINT ' + savepoint)
    this.depth++

    let result: T
    try {
      result = fn()
      if (isThenable(result)) {
        throw new TypeError('transaction() callbacks must be synchronous')
      }
    } catch (error) {
      this.depth--
      this.rollback(outermost, savepoint)
      throw error
    }

    this.depth--
    try {
      this.db.exec(outermost ? 'COMMIT' : 'RELEASE ' + savepoint)
    } catch (error) {
      this.rollback(outermost, savepoint)
      throw error
    }
    return result
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.db.close()
  }

  /** Rolls back without masking the error that caused it. */
  private rollback(outermost: boolean, savepoint: string): void {
    try {
      this.db.exec(outermost ? 'ROLLBACK' : 'ROLLBACK TO ' + savepoint + '; RELEASE ' + savepoint)
    } catch {
      // The connection may already have rolled back on its own (e.g. after a disk error).
    }
  }
}

function isThenable(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

export function openDatabase(path: string, options: OpenOptions = {}): Db {
  return new SqliteDb(path, options)
}
