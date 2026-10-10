import { useEffect, useRef } from 'react'
import { useConnectionStore } from '../store/connectionStore'
import type { OnboardingEvent, OnboardingState } from './onboardingMachine'

/**
 * The driver of an account login (change `subscription-providers`): it talks to main while the panel in
 * `AccountFlow.tsx` shows the code.
 */

/** How often the renderer reads the login's state; main polls the provider on its own clock. */
export const POLL_MS = 2000

/**
 * Drives a login through the machine: asks main for a code when the state is `starting`, then reads the
 * login's status every two seconds while it is `polling`. Leaving `polling` any other way (Hủy, closing)
 * cancels the login in main, so no token is stored after the person walked away.
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
      // Unmounted or moved on while still waiting: stop main from storing a token nobody wants now.
      if (!finished) void window.mira.ai.accounts.cancel(sessionId)
    }
  }, [sessionId, dispatch])
}
