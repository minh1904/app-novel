import type { ConnectionKeyView, ConnectionView } from '../../../../shared/contracts/aiConnections'
import type { BadgeTone } from '../../components/Badge'
import type { TestState } from '../../stores/connectionStore'

/** Khoảng thời gian còn lại, nói bằng chữ người đọc được chứ không phải một mốc epoch. */
function remaining(until: number, now: number): string {
  const minutes = Math.max(0, Math.round((until - now) / 60_000))
  if (minutes < 1) return 'dưới một phút'
  if (minutes < 60) return minutes + ' phút'
  return Math.round(minutes / 60) + ' giờ'
}

export function keyBadge(key: ConnectionKeyView, now: number): { tone: BadgeTone; label: string } {
  if (key.state === 'invalid') return { tone: 'error', label: 'Khóa sai' }
  if (key.frozenUntil !== null && key.frozenUntil > now) {
    const scope = key.frozenScope === 'day' ? 'Hết hạn mức hôm nay' : 'Hết hạn mức'
    return { tone: 'warning', label: scope + ' · còn ' + remaining(key.frozenUntil, now) }
  }
  return { tone: 'success', label: 'Dùng được' }
}

/** Có ít nhất một khóa dùng được ngay (hoặc endpoint không cần khóa và đã kiểm tra được). */
export function connectionLive(connection: ConnectionView, now: number): boolean {
  if (!connection.enabled) return false
  if (connection.keys.length === 0) return connection.checkedAt !== null
  return connection.keys.some(
    (key) => key.state === 'ok' && (key.frozenUntil === null || key.frozenUntil <= now)
  )
}

/** Trạng thái của cả kết nối, suy từ trạng thái các khóa và lần kiểm tra gần nhất. */
export function connectionBadge(
  connection: ConnectionView,
  test: TestState,
  now: number
): { tone: BadgeTone; label: string } {
  if (!connection.enabled) return { tone: 'muted', label: 'Đã tắt' }
  if (test.running) return { tone: 'muted', label: 'Đang kiểm tra…' }
  if (test.error) return { tone: 'error', label: 'Không nối được' }
  const live = connection.keys.filter(
    (key) => key.state === 'ok' && (key.frozenUntil === null || key.frozenUntil <= now)
  )
  if (connection.keys.length > 0 && live.length === 0)
    return { tone: 'error', label: 'Hết hạn mức' }
  if (live.length < connection.keys.length)
    return { tone: 'warning', label: 'Một khóa hết hạn mức' }
  if (connection.checkedAt === null) return { tone: 'muted', label: 'Chưa kiểm tra' }
  return { tone: 'success', label: 'Đang chạy' }
}
