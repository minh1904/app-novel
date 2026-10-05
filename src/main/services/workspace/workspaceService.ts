import * as v from 'valibot'
import {
  emptyWorkspace,
  workspaceStateSchema,
  type WorkspaceLoad,
  type WorkspaceState,
  type WorkspaceTab
} from '../../../shared/contracts/workspace'
import { StorageError } from '../../infra/storage/errors'
import type { LibraryStore } from '../library/library'

const KEY = 'workspace:v1'

export class WorkspaceService {
  constructor(private readonly library: LibraryStore) {}

  load(): WorkspaceLoad {
    const row = this.library.appDb
      .prepare('SELECT value FROM meta WHERE key = ?')
      .get<{ value: string }>(KEY)
    if (!row) return { state: emptyWorkspace, notices: [] }

    let parsed: unknown
    try {
      parsed = JSON.parse(row.value)
    } catch {
      throw new StorageError('corrupt', 'Không đọc được phiên tab đã lưu.')
    }
    const result = v.safeParse(workspaceStateSchema, parsed)
    if (!result.success) throw new StorageError('corrupt', 'Phiên tab đã lưu không hợp lệ.')

    const knownWorks = new Set(this.library.list().works.map((work) => work.id))
    const seen = new Set<string>()
    const notices: string[] = []
    const tabs: WorkspaceTab[] = []
    for (const tab of result.output.tabs) {
      if (!knownWorks.has(tab.workId)) {
        notices.push('Một tab tác phẩm đã bị bỏ qua vì tác phẩm không còn trong Thư viện.')
        continue
      }
      if (seen.has(tab.workId)) continue
      seen.add(tab.workId)
      if (tab.location.name === 'chapter') {
        const chapterId = tab.location.chapterId
        try {
          if (!this.library.listChapters(tab.workId).some((chapter) => chapter.id === chapterId)) {
            tabs.push({ ...tab, location: { name: 'work' } })
            notices.push('Một chương đã bị xóa; tab được mở ở trang tác phẩm.')
            continue
          }
        } catch {
          tabs.push({ ...tab, location: { name: 'work' } })
          notices.push('Không mở được chương đã lưu; tab được mở ở trang tác phẩm.')
          continue
        }
      }
      tabs.push(tab)
    }
    const activeWorkId = tabs.some((tab) => tab.workId === result.output.activeWorkId)
      ? result.output.activeWorkId
      : (tabs[0]?.workId ?? null)
    return { state: { version: 1, tabs, activeWorkId }, notices }
  }

  save(state: WorkspaceState): void {
    const parsed = v.safeParse(workspaceStateSchema, state)
    if (!parsed.success) throw new StorageError('validation', 'Phiên tab không hợp lệ.')
    const ids = parsed.output.tabs.map((tab) => tab.workId)
    if (
      new Set(ids).size !== ids.length ||
      (state.activeWorkId !== null && !ids.includes(state.activeWorkId))
    ) {
      throw new StorageError(
        'validation',
        'Danh sách tab bị trùng hoặc tab hoạt động không tồn tại.'
      )
    }
    this.library.appDb
      .prepare(
        'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      .run(KEY, JSON.stringify(parsed.output))
  }
}
