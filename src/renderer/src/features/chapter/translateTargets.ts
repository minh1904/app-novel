import type { ConnectionView } from '../../../../shared/contracts/aiConnections'

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
 * có mục là thứ hộp thoại dịch mở ra với.
 */
export function targetsOf(connections: readonly ConnectionView[]): TranslateTarget[] {
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
  return targets
}
