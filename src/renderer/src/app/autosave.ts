import { useEffect, useRef } from 'react'
import { notifyError } from '../components/ui/notificationStore'

/** Hermes saves a settings field 550 ms after the last change (its settings/config-settings.tsx). */
export const AUTOSAVE_DELAY_MS = 550

/**
 * Saves values one after another, never two at once and never out of order: a value queued while a save
 * runs waits for it, and only the newest queued value is sent, since anything in between is already stale.
 * A failed save is reported and does not stop the next one.
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
 * Saves `value` once it has stopped changing for `delay` ms. The first render does not save: the value came
 * from storage. `save` may change between renders; the newest one is used.
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
