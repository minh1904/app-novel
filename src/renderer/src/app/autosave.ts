import { useEffect, useRef } from 'react'
import { notifyError } from '../components/ui/notificationStore'

/** Thời gian chờ mặc định (ms) sau thay đổi cuối cùng trước khi tự động lưu giá trị. */
export const AUTOSAVE_DELAY_MS = 550

/**
 * Hàng đợi lưu giá trị tuần tự: không bao giờ lưu hai yêu cầu cùng lúc và đảm bảo đúng thứ tự.
 * Khi một thao tác lưu đang chạy, các giá trị mới sẽ chờ và chỉ giá trị mới nhất được gửi đi.
 * Lỗi lưu được ghi nhận qua hàm callback và không làm gián đoạn các lượt lưu tiếp theo.
 */
export function createSaveQueue<T>(
  save: (value: T) => Promise<void>,
  onError: (error: unknown) => void
): { push(value: T): Promise<void> } {
  let running: Promise<void> | null = null
  let pending: { value: T } | null = null

  async function drain(): Promise<void> {
    while (pending) {
      const { value } = pending
      pending = null
      try {
        await save(value)
      } catch (error) {
        onError(error)
      }
    }
    running = null
  }

  return {
    push(value) {
      pending = { value }
      if (!running) running = drain()
      return running
    }
  }
}

/**
 * Tự động lưu `value` sau khi ngừng thay đổi trong khoảng thời gian `delay` ms.
 * Lần render đầu tiên không kích hoạt lưu vì giá trị được lấy từ bộ nhớ.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  options: { delay?: number; errorTitle?: string } = {}
): void {
  const { delay = AUTOSAVE_DELAY_MS, errorTitle = 'Không lưu được thay đổi' } = options
  const saveRef = useRef(save)
  saveRef.current = save
  const queue = useRef<ReturnType<typeof createSaveQueue<T>> | null>(null)
  queue.current ??= createSaveQueue<T>(
    (next) => saveRef.current(next),
    (error) => notifyError(error, errorTitle)
  )
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return undefined
    }
    const timer = setTimeout(() => void queue.current?.push(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
}
