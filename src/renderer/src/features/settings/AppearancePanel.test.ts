import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppearanceSettings } from './AppearancePanel'

const render = (state: { glass: boolean; glassSupported: boolean } | null): string =>
  renderToStaticMarkup(
    createElement(AppearanceSettings, { state, busy: false, onGlassChange: () => undefined })
  )

describe('Giao diện settings', () => {
  it('locks the glass switch and says why on a Windows that cannot draw acrylic', () => {
    const html = render({ glass: false, glassSupported: false })
    expect(html).toContain('Hiệu ứng kính (acrylic)')
    expect(html).toMatch(
      /role="switch"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*role="switch"/
    )
    expect(html).toContain('build 22621')
  })

  it('offers the switch, off by default, where it is supported', () => {
    const html = render({ glass: false, glassSupported: true })
    expect(html).not.toContain('build 22621')
    expect(html).toContain('aria-checked="false"')
    expect(html).not.toContain('aria-disabled="true"')
  })

  it('shows the switch on when glass is on', () => {
    expect(render({ glass: true, glassSupported: true })).toContain('aria-checked="true"')
  })
})
