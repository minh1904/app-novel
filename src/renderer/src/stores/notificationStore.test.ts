import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastStacks } from '../components/ui/Toast'
import { resetAllStores } from './resetStores'
import {
  notify,
  notifyError,
  QUIET_TOAST_MS,
  toastShape,
  useNotificationStore
} from './notificationStore'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  resetAllStores()
  vi.useRealTimers()
})

describe('toast shape', () => {
  it('keeps a success quiet and brief', () => {
    expect(toastShape({ kind: 'success' })).toEqual({
      placement: 'bottom-right',
      durationMs: QUIET_TOAST_MS
    })
  })

  it('keeps an error, a warning or anything with a button until dismissed, at the top', () => {
    expect(toastShape({ kind: 'error' })).toEqual({ placement: 'top-center', durationMs: null })
    expect(toastShape({ kind: 'warning' })).toEqual({ placement: 'top-center', durationMs: null })
    expect(
      toastShape({ kind: 'success', action: { label: 'Mở', onClick: () => undefined } })
    ).toEqual({ placement: 'top-center', durationMs: null })
  })
})

describe('notification store', () => {
  it('drops a quiet toast after five seconds and keeps an error', () => {
    notify({ kind: 'success', title: 'Đã lưu' })
    notifyError(new Error('Hết hạn mức'), 'Không lưu được')
    vi.advanceTimersByTime(QUIET_TOAST_MS)
    const left = useNotificationStore.getState().toasts
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({
      kind: 'error',
      title: 'Không lưu được',
      message: 'Hết hạn mức'
    })
  })

  it('renders a status for a success and an alert for an error', () => {
    notify({ kind: 'success', title: 'Đã lưu' })
    notify({ kind: 'error', title: 'Lỗi' })
    const html = renderToStaticMarkup(
      createElement(ToastStacks, { toasts: useNotificationStore.getState().toasts })
    )
    expect(html).toContain('role="status"')
    expect(html).toContain('role="alert"')
  })
})
