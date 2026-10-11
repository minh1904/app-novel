import type { Input, WebContents } from 'electron'

/**
 * Trang chạy ở mức 100%: thang kích thước chữ trong tokens.css chính là kích thước trên màn hình.
 * Mức này được cố định vì chiều cao của các nút điều khiển cửa sổ được tính toán dựa trên nó.
 */
export const ZOOM_FACTOR = 1

/**
 * Phím tắt Ctrl/Cmd kết hợp với `=`, `+`, `-` hoặc `0`: các phím thu phóng của trình duyệt. Ứng dụng giữ
 * một mức zoom duy nhất vì các nút cửa sổ được hệ điều hành vẽ với chiều cao tính theo nó, nếu thay đổi sẽ
 * bị lệch khỏi thanh tiêu đề.
 */
export function isZoomShortcut(input: Pick<Input, 'type' | 'key' | 'control' | 'meta'>): boolean {
  if (input.type !== 'keyDown') return false
  if (!input.control && !input.meta) return false
  return input.key === '=' || input.key === '+' || input.key === '-' || input.key === '0'
}

/** Áp dụng mức thu phóng và giữ cố định, ngăn chặn phím tắt zoom, Ctrl+cuộn chuột và thao tác chụm ngón tay. */
export function pinZoom(contents: WebContents): void {
  const apply = (): void => contents.setZoomFactor(ZOOM_FACTOR)
  contents.on('did-finish-load', () => {
    apply()
    void contents.setVisualZoomLevelLimits(1, 1)
  })
  // Ctrl+cuộn chuột có thể thay đổi zoom ngoài menu accelerator; đặt lại ngay lập tức.
  contents.on('zoom-changed', apply)
  contents.on('before-input-event', (event, input) => {
    if (isZoomShortcut(input)) event.preventDefault()
  })
}
