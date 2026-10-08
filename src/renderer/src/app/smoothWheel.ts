/**
 * Smooth scrolling for a notched mouse wheel. Chromium on Windows moves a pane ~100px per notch almost
 * at once, which reads as a jump in long story text; this glides the same distance over a few frames.
 *
 * Only a mouse wheel is taken over: a touchpad already sends a stream of small deltas with its own
 * inertia, and easing those again would make it lag. The page scrolls natively whenever the user asks
 * for less motion, holds Ctrl (zoom keys) or scrolls sideways.
 */

/** How much of the remaining distance each frame covers: 0.2 settles in about 250ms at 60fps. */
const EASE = 0.2

/** One notch of a mouse wheel reports a whole multiple of 120 in the legacy wheelDelta. */
export function isMouseWheel(
  event: Pick<WheelEvent, 'deltaMode' | 'deltaY'> & { wheelDeltaY?: number }
): boolean {
  if (event.deltaMode !== 0) return true
  const legacy = event.wheelDeltaY
  if (legacy === undefined || legacy === 0) return false
  return legacy % 120 === 0
}

/** Pixels for a delta given in lines or pages, as Chromium would scroll them. */
export function deltaPixels(
  event: Pick<WheelEvent, 'deltaMode' | 'deltaY'>,
  pageHeight: number
): number {
  if (event.deltaMode === 1) return event.deltaY * 40
  if (event.deltaMode === 2) return event.deltaY * pageHeight
  return event.deltaY
}

interface Scrollable {
  scrollTop: number
  readonly scrollHeight: number
  readonly clientHeight: number
}

/** Whether `element` can still move in the direction of `delta`. */
export function canScroll(element: Scrollable, delta: number): boolean {
  const max = element.scrollHeight - element.clientHeight
  if (max <= 1) return false
  return delta < 0 ? element.scrollTop > 0 : element.scrollTop < max - 1
}

function scrollParent(start: EventTarget | null, delta: number): HTMLElement | null {
  let node = start instanceof Element ? start : null
  while (node) {
    if (node instanceof HTMLElement) {
      const overflow = getComputedStyle(node).overflowY
      if ((overflow === 'auto' || overflow === 'scroll') && canScroll(node, delta)) return node
    }
    node = node.parentElement
  }
  return null
}

interface Glide {
  element: HTMLElement
  target: number
  /** The position this code set last; anything else means the user scrolled another way. */
  last: number
  frame: number
}

/** Installs the wheel handler on `doc`; returns a function that removes it. */
export function installSmoothWheel(doc: Document = document): () => void {
  const view = doc.defaultView
  if (!view) return () => undefined
  const reduce = view.matchMedia('(prefers-reduced-motion: reduce)')
  let glide: Glide | null = null

  function stop(): void {
    if (glide) view?.cancelAnimationFrame(glide.frame)
    glide = null
  }

  function step(): void {
    if (!glide) return
    const { element } = glide
    if (Math.abs(element.scrollTop - glide.last) > 1) {
      stop()
      return
    }
    const remaining = glide.target - element.scrollTop
    const next = Math.abs(remaining) < 0.5 ? glide.target : element.scrollTop + remaining * EASE
    element.scrollTop = next
    glide.last = element.scrollTop
    // The edge stops the element short of the target; there is nothing left to glide to.
    if (next === glide.target || Math.abs(element.scrollTop - next) > 1) {
      stop()
      return
    }
    glide.frame = view!.requestAnimationFrame(step)
  }

  function onWheel(event: WheelEvent): void {
    if (event.defaultPrevented || event.ctrlKey || reduce.matches) return
    if (event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    if (!isMouseWheel(event as WheelEvent & { wheelDeltaY?: number })) return
    const delta = deltaPixels(event, view!.innerHeight)
    const element = scrollParent(event.target, delta)
    if (!element) return
    event.preventDefault()

    const max = element.scrollHeight - element.clientHeight
    const from = glide && glide.element === element ? glide.target : element.scrollTop
    const target = Math.min(max, Math.max(0, from + delta))
    if (glide && glide.element === element) {
      glide.target = target
      return
    }
    stop()
    glide = { element, target, last: element.scrollTop, frame: 0 }
    glide.frame = view!.requestAnimationFrame(step)
  }

  doc.addEventListener('wheel', onWheel, { passive: false, capture: true })
  return () => {
    stop()
    doc.removeEventListener('wheel', onWheel, { capture: true })
  }
}
