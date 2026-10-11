import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import type { MainModel, ModelRef } from '../../../../../shared/contracts/aiPreferences'

/**
 * Các mục model dùng được để dịch, và thứ tự chọn mặc định giữa chúng. Tách khỏi hook dịch vì đây là
 * phần quyết định *mục nào được chọn sẵn* — một quyết định có luật, và test được mà không cần React.
 */

export interface TranslateTarget {
  connectionId: string
  /** Id của mục model: dịch bằng cấu hình của chính mục này. */
  entryId: string
  label: string
}

export const targetKey = (connectionId: string, entryId: string): string =>
  connectionId + '|' + entryId

/**
 * Mỗi mục model của mỗi kết nối **đang bật** là một lựa chọn; kết nối tắt không đưa ra gì, và kết nối chưa có
 * mục nào không đưa ra gì (không có mục thì không gọi được).
 *
 * Thứ tự: kết nối theo thứ tự người dùng xếp; trong mỗi kết nối, **mục mặc định đứng đầu**, các mục còn lại
 * giữ thứ tự đã xếp. Mục đầu tiên của cả danh sách là mục được chọn sẵn, nên mặc định của kết nối đầu tiên
 * có mục là thứ hộp thoại dịch mở ra với — trừ khi Cài đặt có model chính còn dùng được: nó đứng đầu.
 */
export function targetsOf(
  connections: readonly ConnectionView[],
  main: MainModel | null = null
): TranslateTarget[] {
  const targets: TranslateTarget[] = []
  for (const connection of connections) {
    if (!connection.enabled) continue
    const entries = [
      ...connection.models.filter((entry) => entry.id === connection.defaultEntryId),
      ...connection.models.filter((entry) => entry.id !== connection.defaultEntryId)
    ]
    for (const entry of entries) {
      targets.push({
        connectionId: connection.id,
        entryId: entry.id,
        label: connection.name + ' · ' + entry.name
      })
    }
  }
  // Ưu tiên đưa model chính trong Cài đặt lên đầu danh sách nếu hợp lệ và khả dụng.
  const index = main
    ? targets.findIndex(
        (target) => target.connectionId === main.connectionId && target.entryId === main.entryId
      )
    : -1
  if (index > 0) targets.unshift(...targets.splice(index, 1))
  return targets
}

/**
 * Xác định model cho tùy chọn "Dịch tiếp bằng…" khi lượt dịch bị dừng giữa chừng:
 * lấy model dự phòng đầu tiên trong Cài đặt khác với model vừa gặp lỗi.
 */
export function continueTargetOf(input: {
  stopped: boolean
  failureAllowsFallback: boolean
  missing: number
  fallbacks: readonly ModelRef[]
  targets: readonly TranslateTarget[]
  current: string | null
}): TranslateTarget | null {
  if (!input.stopped || !input.failureAllowsFallback || input.missing === 0) return null
  for (const ref of input.fallbacks) {
    const target = input.targets.find(
      (item) => item.connectionId === ref.connectionId && item.entryId === ref.entryId
    )
    if (target && targetKey(target.connectionId, target.entryId) !== input.current) return target
  }
  return null
}
