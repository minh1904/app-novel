import type {
  ConnectionKeyView,
  ConnectionView
} from '../../../../../shared/contracts/aiConnections'
import type { BadgeColor } from '../../../components/ui/Badge'

/** Khoảng thời gian còn lại, nói bằng chữ người đọc được chứ không phải một mốc epoch. */
function remaining(until: number, now: number): string {
  const minutes = Math.max(0, Math.round((until - now) / 60_000))
  if (minutes < 1) return 'dưới một phút'
  if (minutes < 60) return minutes + ' phút'
  return Math.round(minutes / 60) + ' giờ'
}

export function keyBadge(key: ConnectionKeyView, now: number): { tone: BadgeColor; label: string } {
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

/**
 * Tiêu đề lỗi liên quan đến khóa API mà người dùng cần xử lý: khóa bị từ chối hoặc hết hạn mức.
 * Trả về `null` đối với các lỗi không liên quan đến khóa.
 */
export function keyProblem(error: { kind: string }): string | null {
  if (error.kind === 'auth') return 'Nhà cung cấp từ chối khóa API.'
  if (error.kind === 'quota') return 'Khóa API đã hết hạn mức.'
  return null
}
