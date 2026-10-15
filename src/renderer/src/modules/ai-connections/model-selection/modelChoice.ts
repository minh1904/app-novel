import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import type { MainModel, ModelRef } from '../../../../../shared/contracts/aiPreferences'

export interface ModelChoice {
  connectionId: string
  entryId: string
  /** Nguồn gốc lựa chọn: được chỉ định riêng, từ model chính trong Cài đặt, hoặc từ mặc định của kết nối. */
  source: 'picked' | 'main' | 'default'
}

function usable(connections: readonly ConnectionView[]): ConnectionView[] {
  return connections.filter((connection) => connection.enabled && connection.models.length > 0)
}

function has(
  connections: readonly ConnectionView[],
  connectionId: string,
  entryId: string
): boolean {
  return connections.some(
    (connection) =>
      connection.id === connectionId && connection.models.some((entry) => entry.id === entryId)
  )
}

/**
 * Mục model đầu tiên chưa nằm trong `taken`, trong `connectionId` nếu có, không thì trong mọi kết nối dùng
 * được. Ưu tiên mục khác model chính, vì dự phòng trùng model đang chạy bị bỏ qua lúc gọi.
 */
export function firstFreeModel(
  connections: readonly ConnectionView[],
  taken: ReadonlySet<string>,
  mainEntryId: string | null,
  connectionId?: string
): ModelRef | null {
  const free = usable(connections)
    .filter((connection) => connectionId === undefined || connection.id === connectionId)
    .flatMap((connection) =>
      connection.models.map((entry) => ({ connectionId: connection.id, entryId: entry.id }))
    )
    .filter((ref) => !taken.has(ref.entryId))
  return free.find((ref) => ref.entryId !== mainEntryId) ?? free[0] ?? null
}

/**
 * Xác định model sử dụng cho lượt dịch hoặc hội thoại: ưu tiên model được chọn riêng,
 * tiếp theo là model chính trong Cài đặt, cuối cùng là model mặc định của kết nối khả dụng đầu tiên.
 * Nếu model trỏ đến kết nối bị vô hiệu hóa hoặc mục đã bị xóa thì sẽ tự động bỏ qua.
 */
export function resolveModelChoice(
  connections: readonly ConnectionView[],
  picked: { connectionId: string | null; entryId: string | null },
  main: MainModel | null
): ModelChoice | null {
  const live = usable(connections)
  if (picked.connectionId && picked.entryId && has(live, picked.connectionId, picked.entryId)) {
    return { connectionId: picked.connectionId, entryId: picked.entryId, source: 'picked' }
  }
  if (main && has(live, main.connectionId, main.entryId)) {
    return { connectionId: main.connectionId, entryId: main.entryId, source: 'main' }
  }
  // Nếu chọn kết nối mà không có mục cụ thể thì sử dụng mục mặc định của kết nối đó.
  const first =
    (picked.connectionId && live.find((connection) => connection.id === picked.connectionId)) ||
    live[0]
  if (!first) return null
  const entry = first.models.find((item) => item.id === first.defaultEntryId) ?? first.models[0]!
  return { connectionId: first.id, entryId: entry.id, source: 'default' }
}
