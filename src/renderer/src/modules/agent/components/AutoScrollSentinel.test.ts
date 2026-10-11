import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AutoScrollSentinel, getScrollBehavior, shouldAutoScroll } from './AutoScrollSentinel'

describe('AutoScrollSentinel (Task 6.6)', () => {
  it('follows stream only when near bottom (distance <= threshold)', () => {
    // Near bottom
    expect(shouldAutoScroll(0)).toBe(true)
    expect(shouldAutoScroll(50, 80)).toBe(true)
    expect(shouldAutoScroll(80, 80)).toBe(true)

    // User scrolled up (> 80px)
    expect(shouldAutoScroll(81, 80)).toBe(false)
    expect(shouldAutoScroll(300, 80)).toBe(false)
  })

  it('selects auto vs smooth scrolling based on prefers-reduced-motion', () => {
    // Normal motion
    expect(getScrollBehavior(() => false)).toBe('smooth')

    // Reduced motion
    expect(getScrollBehavior(() => true)).toBe('auto')
  })

  it('renders "Nội dung mới" button only when user scrolled up and new content arrived', () => {
    const withPill = renderToStaticMarkup(
      createElement(AutoScrollSentinel, {
        showNewContentPill: true,
        onScrollToBottom: () => {}
      })
    )
    expect(withPill).toContain('Nội dung mới')

    const withoutPill = renderToStaticMarkup(
      createElement(AutoScrollSentinel, {
        showNewContentPill: false,
        onScrollToBottom: () => {}
      })
    )
    expect(withoutPill).not.toContain('Nội dung mới')
  })
})
