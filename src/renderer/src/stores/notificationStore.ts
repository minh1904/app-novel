import { create } from 'zustand'
import { registerStoreReset } from './resetStores'

/**
 * Toasts in Hermes Desktop's manner (its store/notifications.ts): a success says its piece quietly in the
 * bottom-right corner and goes away after 5 seconds; an error, or anything that carries a button, stays
 * at the top centre until it is dismissed, because the person has to read it or act on it.
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
  /** `null` stays until dismissed. */
  durationMs: number | null
  placement: 'bottom-right' | 'top-center'
}

export interface NotifyInput {
  kind?: ToastKind
  title: string
  message?: string
  action?: ToastAction
  /** Overrides the default for the kind; `null` keeps the toast until it is dismissed. */
  durationMs?: number | null
}

export const QUIET_TOAST_MS = 5_000
/** More than this many toasts at once is noise; the oldest goes. */
const MAX_TOASTS = 4

/** Where and for how long a toast shows, from what it is. */
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

/** An error toast with the error's own message, or the fallback when it has none worth showing. */
export function notifyError(error: unknown, fallbackTitle: string): number {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : undefined
  return notify({ kind: 'error', title: fallbackTitle, message: message || undefined })
}
