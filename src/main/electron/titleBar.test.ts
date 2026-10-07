import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOOT_BACKGROUND, CHROME_COLORS, HEADER_HEIGHT, TOP_BAR_HEIGHT } from './titleBar'
import { isZoomShortcut, ZOOM_FACTOR } from './zoom'

const TOKENS = resolve(__dirname, '../../renderer/src/styles/tokens.css')

/** The value of one custom property inside the first rule whose selector line starts with `selector`. */
function tokenIn(css: string, selector: string, property: string): string {
  const start = css.indexOf(selector)
  expect(start, selector + ' is in tokens.css').toBeGreaterThanOrEqual(0)
  const block = css.slice(start, css.indexOf('}', start))
  // Only spaces around the value (tokens.css is written that way), so the pattern needs no escapes.
  const match = new RegExp(property + ': *(#[0-9a-fA-F]{3,8}|[0-9.]+px) *;').exec(block)
  expect(match, property + ' in ' + selector).not.toBeNull()
  return (match as RegExpExecArray)[1].toLowerCase()
}

describe('window button colours', () => {
  const css = readFileSync(TOKENS, 'utf8')

  // The OS paints these glyphs, so they cannot read a CSS variable; if the token changes and this copy
  // does not, the buttons stop matching the text around them and nothing else notices.
  it('dark glyphs match the dark muted text', () => {
    expect(CHROME_COLORS.dark.symbolColor).toBe(
      tokenIn(css, "html[data-theme='dark']", '--text-muted')
    )
  })

  it('light glyphs match the light muted text', () => {
    expect(CHROME_COLORS.light.symbolColor).toBe(
      tokenIn(css, "html[data-theme='light']", '--text-muted')
    )
  })

  it('leaves the bar colour to the page', () => {
    expect(CHROME_COLORS.dark.color).toBe('rgba(1, 0, 0, 0)')
    expect(CHROME_COLORS.light.color).toBe('rgba(1, 0, 0, 0)')
  })

  it('starts the window in a near-black and a near-white, not the old greys', () => {
    expect(BOOT_BACKGROUND.dark).toBe('#0d1015')
    expect(BOOT_BACKGROUND.light).toBe('#fefefe')
  })
})

describe('title bar height', () => {
  const css = readFileSync(TOKENS, 'utf8')

  it('matches --header-height in tokens.css', () => {
    expect(tokenIn(css, ':root {', '--header-height')).toBe(HEADER_HEIGHT + 'px')
  })

  it('is the zoomed bar less its bottom border row', () => {
    expect(ZOOM_FACTOR).toBe(0.9)
    expect(TOP_BAR_HEIGHT).toBe(30)
  })
})

describe('zoom keys', () => {
  type Key = Parameters<typeof isZoomShortcut>[0]
  const key = (
    k: string,
    mods: { control?: boolean; meta?: boolean } = { control: true }
  ): Key => ({
    type: 'keyDown',
    key: k,
    control: mods.control ?? false,
    meta: mods.meta ?? false
  })

  it('blocks the browser zoom shortcuts', () => {
    for (const k of ['=', '+', '-', '0']) expect(isZoomShortcut(key(k))).toBe(true)
    expect(isZoomShortcut(key('=', { meta: true }))).toBe(true)
  })

  it('lets other keys and plain digits through', () => {
    expect(isZoomShortcut(key('s'))).toBe(false)
    expect(isZoomShortcut(key('0', {}))).toBe(false)
    expect(isZoomShortcut({ ...key('-'), type: 'keyUp' })).toBe(false)
  })
})
