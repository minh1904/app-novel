import { StorageError } from './errors'
import type { Db } from './sqlite'

export interface Migration {
  /** Target schema version; migrations must be listed with strictly increasing versions from 1. */
  version: number
  up(db: Db): void
  /**
   * Rebuilding a table that others reference must not cascade-delete their rows, so foreign keys are
   * switched off around the step (the pragma is a no-op inside a transaction) and checked before commit.
   */
  foreignKeysOff?: boolean
}

export interface SchemaSpec {
  /** Stored in `PRAGMA application_id` so a Mira file can be recognised. */
  applicationId: number
  migrations: Migration[]
}

interface Pragmas {
  userVersion: number
  applicationId: number
}

export function readPragmas(db: Db): Pragmas {
  const userVersion = db.prepare('PRAGMA user_version').get<{ user_version: number }>()
  const applicationId = db.prepare('PRAGMA application_id').get<{ application_id: number }>()
  return {
    userVersion: userVersion?.user_version ?? 0,
    applicationId: applicationId?.application_id ?? 0
  }
}

export function latestVersion(spec: SchemaSpec): number {
  return spec.migrations.length === 0 ? 0 : spec.migrations[spec.migrations.length - 1].version
}

/**
 * Brings a database to the latest schema. Each step runs in its own transaction together with the
 * version bump, so a failing step leaves the file at the previous version. A file written by a newer
 * app, or one that is not a Mira file, is refused without being modified.
 */
export function migrate(db: Db, spec: SchemaSpec): void {
  const { userVersion, applicationId } = readPragmas(db)
  const latest = latestVersion(spec)

  if (applicationId !== 0 && applicationId !== spec.applicationId) {
    throw new StorageError('corrupt', 'Tệp này không phải dữ liệu Mira.')
  }
  if (applicationId === 0 && userVersion !== 0) {
    throw new StorageError('corrupt', 'Tệp này không phải dữ liệu Mira.')
  }
  if (userVersion > latest) {
    throw new StorageError(
      'unsupported_version',
      'Tệp được tạo bởi phiên bản Mira mới hơn (schema ' +
        userVersion +
        ', bản này hiểu tới ' +
        latest +
        '). Hãy cập nhật Mira.'
    )
  }

  for (const migration of spec.migrations) {
    if (migration.version <= userVersion) continue
    if (migration.foreignKeysOff) db.exec('PRAGMA foreign_keys = OFF')
    try {
      db.transaction(() => {
        migration.up(db)
        if (migration.foreignKeysOff) {
          const broken = db.prepare('PRAGMA foreign_key_check').all()
          if (broken.length > 0) {
            throw new StorageError(
              'corrupt',
              'Migration ' + migration.version + ' để lại ' + broken.length + ' liên kết hỏng.'
            )
          }
        }
        db.exec('PRAGMA user_version = ' + migration.version)
      })
    } finally {
      if (migration.foreignKeysOff) db.exec('PRAGMA foreign_keys = ON')
    }
  }
}
