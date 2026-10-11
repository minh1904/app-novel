import { create } from 'zustand'
import { registerStoreReset } from '../../lib/testing/resetStores'

/**
 * Quản lý thông báo toast: thông báo thành công hoặc thông tin hiển thị nhẹ nhàng ở góc
 * dưới bên phải và tự ẩn sau 5 giây; thông báo lỗi hoặc có nút thao tác sẽ hiển thị ở giữa
 * phía trên cho đến khi người dùng đóng lại.
 */
export type ToastKind = 'success' | 'info' | 'warning' | 'error'

export interface ToastAction {
  label: string
  onClick(): void
}

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
  action?: ToastAction
  /** `null` nghĩa là thông báo hiển thị cho đến khi được đóng thủ công. */
  durationMs: number | null
  placement: 'bottom-right' | 'top-center'
}

export interface NotifyInput {
  kind?: ToastKind
  title: string
  message?: string
  action?: ToastAction
  /** Ghi đè thời gian hiển thị mặc định của loại thông báo; `null` giữ thông báo cho đến khi đóng. */
  durationMs?: number | null
}

export const QUIET_TOAST_MS = 5_000
/** Giới hạn số lượng thông báo hiển thị đồng thời; thông báo cũ nhất sẽ bị xóa khi vượt quá. */
const MAX_TOASTS = 4

/** Xác định vị trí và thời lượng hiển thị dựa trên loại thông báo và hành động kèm theo. */
export function toastShape(
  input: Pick<NotifyInput, 'kind' | 'action' | 'durationMs'>
): Pick<Toast, 'durationMs' | 'placement'> {
  const kind = input.kind ?? 'info'
  const sticky = kind === 'error' || kind === 'warning' || input.action !== undefined
  return {
    placement: sticky ? 'top-center' : 'bottom-right',
    durationMs: input.durationMs !== undefined ? input.durationMs : sticky ? null : QUIET_TOAST_MS
  }
}

interface NotificationState {
  toasts: Toast[]
  notify(input: NotifyInput): number
  dismiss(id: number): void
}

let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  toasts: [],
  notify(input) {
    const id = nextId++
    const toast: Toast = {
      id,
      kind: input.kind ?? 'info',
      title: input.title,
      message: input.message,
      action: input.action,
      ...toastShape(input)
    }
    set((state) => ({ toasts: [...state.toasts, toast].slice(-MAX_TOASTS) }))
    if (toast.durationMs !== null) {
      timers.set(
        id,
        setTimeout(() => get().dismiss(id), toast.durationMs)
      )
    }
    return id
  },
  dismiss(id) {
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  }
}))

registerStoreReset(() => {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  useNotificationStore.setState({ toasts: [] })
})

export function notify(input: NotifyInput): number {
  return useNotificationStore.getState().notify(input)
}

/** Hiển thị thông báo lỗi với nội dung lỗi cụ thể, hoặc dùng tiêu đề dự phòng nếu không có thông báo chi tiết. */
export function notifyError(error: unknown, fallbackTitle: string): number {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : undefined
  return notify({ kind: 'error', title: fallbackTitle, message: message || undefined })
}
