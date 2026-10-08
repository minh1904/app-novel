import { describe, expect, it } from 'vitest'
import { canScroll, deltaPixels, isMouseWheel } from './smoothWheel'

describe('smooth wheel', () => {
  it('takes over a notched mouse wheel but leaves a touchpad alone', () => {
    expect(isMouseWheel({ deltaMode: 0, deltaY: 100, wheelDeltaY: -120 })).toBe(true)
    expect(isMouseWheel({ deltaMode: 0, deltaY: 200, wheelDeltaY: -240 })).toBe(true)
    expect(isMouseWheel({ deltaMode: 1, deltaY: 3 })).toBe(true)
    expect(isMouseWheel({ deltaMode: 0, deltaY: 7.5, wheelDeltaY: -9 })).toBe(false)
    expect(isMouseWheel({ deltaMode: 0, deltaY: 4 })).toBe(false)
  })

  it('turns lines and pages into pixels', () => {
    expect(deltaPixels({ deltaMode: 0, deltaY: 100 }, 800)).toBe(100)
    expect(deltaPixels({ deltaMode: 1, deltaY: 3 }, 800)).toBe(120)
    expect(deltaPixels({ deltaMode: 2, deltaY: -1 }, 800)).toBe(-800)
  })

  it('lets a pane at its edge pass the wheel to the one around it', () => {
    const pane = { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 }
    expect(canScroll(pane, -100)).toBe(false)
    expect(canScroll(pane, 100)).toBe(true)
    expect(canScroll({ ...pane, scrollTop: 600 }, 100)).toBe(false)
    expect(canScroll({ scrollTop: 0, scrollHeight: 400, clientHeight: 400 }, 100)).toBe(false)
  })
})
