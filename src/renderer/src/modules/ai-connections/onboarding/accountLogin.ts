import { useEffect, useRef } from 'react'
import { useConnectionStore } from '../store/connectionStore'
import type { OnboardingEvent, OnboardingState } from './onboardingMachine'

/**
 * Điều phối quy trình đăng nhập tài khoản: giao tiếp với tiến trình chính trong khi bảng giao diện hiển thị mã xác nhận.
 */

/** Tần suất renderer kiểm tra trạng thái đăng nhập; tiến trình chính thăm dò nhà cung cấp theo chu kỳ riêng. */
export const POLL_MS = 2000

/**
 * Quản lý vòng đời đăng nhập tài khoản: yêu cầu mã khi ở trạng thái `starting`,
 * sau đó kiểm tra trạng thái mỗi 2 giây khi ở trạng thái `polling`.
 * Rời khỏi `polling` (hủy, đóng) sẽ gửi yêu cầu hủy sang tiến trình chính.
 */
export function useAccountLogin(
  state: OnboardingState,
  dispatch: (event: OnboardingEvent) => void,
  onConnected: (connectionId: string) => Promise<void> | void
): void {
  const provider = state.step === 'starting' ? state.provider : null
  useEffect(() => {
    if (provider === null) return
    let active = true
    void window.mira.ai.accounts.start(provider).then((result) => {
      if (!active) {
        if (result.ok) void window.mira.ai.accounts.cancel(result.value.sessionId)
        return
      }
      if (result.ok) dispatch({ type: 'started', login: result.value })
      else dispatch({ type: 'failed', message: result.error.message })
    })
    return () => {
      active = false
    }
  }, [provider, dispatch])

  const sessionId = state.step === 'polling' ? state.login.sessionId : null
  const connected = useRef(onConnected)
  useEffect(() => {
    connected.current = onConnected
  })
  useEffect(() => {
    if (sessionId === null) return
    let finished = false
    const timer = setInterval(() => {
      void window.mira.ai.accounts.poll(sessionId).then(async (result) => {
        if (finished) return
        if (!result.ok) {
          finished = true
          dispatch({ type: 'failed', message: result.error.message })
          return
        }
        const status = result.value
        if (status.state === 'pending') return
        finished = true
        if (status.state === 'approved') {
          await useConnectionStore.getState().reload()
          await connected.current(status.connectionId)
          dispatch({ type: 'connected', connectionId: status.connectionId })
        } else if (status.state !== 'cancelled') {
          dispatch({
            type: 'failed',
            message:
              status.state === 'expired'
                ? 'Mã đã hết hạn trước khi bạn xác nhận.'
                : (status.message ?? 'Nhà cung cấp từ chối đăng nhập.'),
            detail: status.state === 'error' ? (status.detail ?? null) : null
          })
        }
      })
    }, POLL_MS)
    return () => {
      clearInterval(timer)
      // Đã unmount hoặc chuyển màn hình khi đang chờ: yêu cầu hủy phiên để không lưu token thừa.
      if (!finished) void window.mira.ai.accounts.cancel(sessionId)
    }
  }, [sessionId, dispatch])
}
