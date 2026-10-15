import type { ConnectionView, ModelInfoView } from '../../../../../shared/contracts/aiConnections'
import type { ModelEntryView, ThinkingLevel } from '../../../../../shared/contracts/modelSettings'

/**
 * Các hàng hiển thị trong menu chọn model: nhóm Yêu thích ở đầu, tiếp theo là từng nhóm kết nối đang bật,
 * được lọc theo ô tìm kiếm. Cuối mỗi nhóm là các model nhà cung cấp đang liệt kê mà chưa có mục ("Có thể thêm").
 */

export type MenuRow =
  | { type: 'header'; id: string; label: string; collapsed: boolean; connectionId: string | null }
  | {
      type: 'model'
      /** Tiền tố `fav:` hoặc `conn:` kết hợp kết nối và mục model, duy nhất giữa các nhóm. */
      id: string
      connection: ConnectionView
      entry: ModelEntryView
      favorite: boolean
    }
  | { type: 'suggest'; id: string; connection: ConnectionView; model: string }

/** Khi chưa tìm kiếm, mỗi nhóm chỉ hiện chừng này model gợi ý; còn lại nằm sau ô tìm kiếm. */
const SUGGESTIONS_SHOWN = 5

/**
 * Model không dùng để chat: embedding, giọng nói, ảnh, video, realtime, kiểm duyệt. Nhà cung cấp trả tất cả
 * trong một danh sách và `/models` không nói loại, nên chỉ đoán theo tên.
 * shortcut: đoán theo tên, nhà cung cấp đặt tên lạ thì lọt rác hoặc mất model; khi đó có ô "Thêm model tùy chỉnh".
 */
const NOT_CHAT =
  /(^|[^a-z])(embed[a-z]*|tts|imagen|veo|image|audio|live|realtime|transcribe|whisper|moderation|dall-e|sora|rerank|aqa)([^a-z]|$)/i

/**
 * Model nhà cung cấp liệt kê mà kết nối chưa có mục, bỏ loại không chat và loại đã khai tử, mới nhất lên
 * đầu (so sánh số trong tên: `gemini-3.5-flash` đứng trước `gemini-2.5-pro`).
 */
export function addableModels(
  listed: readonly ModelInfoView[],
  connection: Pick<ConnectionView, 'models'>
): string[] {
  const have = new Set(connection.models.map((entry) => entry.model))
  const ids = listed
    .filter((model) => model.status !== 'deprecated' && !NOT_CHAT.test(model.id))
    .map((model) => model.id)
    .filter((id) => !have.has(id))
  return [...new Set(ids)].sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
}

export const favoriteKey = (connectionId: string, entryId: string): string =>
  connectionId + ':' + entryId

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function hasWords(query: string, text: string): boolean {
  const haystack = fold(text)
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

function matches(query: string, connection: ConnectionView, entry: ModelEntryView): boolean {
  return hasWords(query, entry.name + ' ' + entry.model + ' ' + connection.name)
}

export function buildMenuRows(
  connections: readonly ConnectionView[],
  query: string,
  favorites: ReadonlySet<string>,
  collapsed: ReadonlySet<string>,
  /** Id kết nối → model có thể thêm (kết quả của `addableModels`). */
  suggestions: ReadonlyMap<string, readonly string[]> = new Map()
): MenuRow[] {
  const live = connections.filter(
    (connection) => connection.enabled && connection.models.length > 0
  )
  const searching = query.trim() !== ''
  const rows: MenuRow[] = []

  const favoriteRows: MenuRow[] = []
  for (const connection of live) {
    for (const entry of connection.models) {
      const key = favoriteKey(connection.id, entry.id)
      if (favorites.has(key) && matches(query, connection, entry)) {
        favoriteRows.push({ type: 'model', id: 'fav:' + key, connection, entry, favorite: true })
      }
    }
  }
  if (favoriteRows.length > 0) {
    rows.push({
      type: 'header',
      id: 'group:favorites',
      label: 'Yêu thích',
      collapsed: false,
      connectionId: null
    })
    rows.push(...favoriteRows)
  }

  for (const connection of live) {
    const entries = connection.models.filter((entry) => matches(query, connection, entry))
    const addable = (suggestions.get(connection.id) ?? []).filter((model) => hasWords(query, model))
    if (entries.length === 0 && addable.length === 0) continue
    // Khi tìm kiếm, luôn hiển thị kết quả tìm được ngay cả trong nhóm đang thu gọn.
    const isCollapsed = !searching && collapsed.has(connection.id)
    rows.push({
      type: 'header',
      id: 'group:' + connection.id,
      label: connection.name,
      collapsed: isCollapsed,
      connectionId: connection.id
    })
    if (isCollapsed) continue
    for (const entry of entries) {
      const key = favoriteKey(connection.id, entry.id)
      rows.push({
        type: 'model',
        id: 'conn:' + key,
        connection,
        entry,
        favorite: favorites.has(key)
      })
    }
    if (addable.length === 0) continue
    rows.push({
      type: 'header',
      id: 'suggest:' + connection.id,
      label: 'Có thể thêm · ' + addable.length,
      collapsed: false,
      connectionId: null
    })
    for (const model of searching ? addable : addable.slice(0, SUGGESTIONS_SHOWN)) {
      rows.push({
        type: 'suggest',
        id: 'suggest:' + connection.id + ':' + model,
        connection,
        model
      })
    }
  }
  return rows
}

/** Nhãn viết tắt hiển thị mức độ suy luận trên hàng model (ví dụ: "MED"). */
export const THINKING_TAGS: Record<ThinkingLevel, string> = {
  off: 'TẮT',
  minimal: 'MIN',
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
  xhigh: 'XHIGH',
  max: 'MAX'
}

/** Tìm hàng chọn được (model hoặc gợi ý) tiếp theo từ `index` theo hướng `direction`, bỏ qua tiêu đề nhóm; giữ nguyên khi chạm biên. */
export function stepModelRow(rows: readonly MenuRow[], index: number, direction: 1 | -1): number {
  for (let at = index + direction; at >= 0 && at < rows.length; at += direction) {
    if (rows[at]!.type !== 'header') return at
  }
  return index
}
