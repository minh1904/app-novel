import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach } from 'vitest'

/** Tạo thư mục tạm và tự động xóa sau mỗi test. Chỉ import từ các tệp test. */
export function createTempDirs(): () => string {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })
  return () => {
    const dir = mkdtempSync(join(tmpdir(), 'mira-test-'))
    dirs.push(dir)
    return dir
  }
}
