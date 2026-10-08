import { useEffect } from 'react'

/** Dialogs open right now; one dialog can open another, so the window stays dim until both close. */
let open = 0

function report(): void {
  if (typeof window !== 'undefined' && window.mira?.setChromeDimmed) {
    window.mira.setChromeDimmed(open > 0).catch(() => undefined)
  }
}

/**
 * Dims the window buttons while `active`, to match the backdrop a modal lays over the page. The OS
 * draws those buttons above the page, so the backdrop alone leaves them as a bright box in the corner.
 */
export function useDimChrome(active: boolean): void {
  useEffect(() => {
    if (!active) return
    open += 1
    report()
    return () => {
      open -= 1
      report()
    }
  }, [active])
}
