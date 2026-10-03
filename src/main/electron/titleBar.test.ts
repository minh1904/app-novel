import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHROME_COLORS } from './titleBar'

const TOKENS = resolve(__dirname, '../../renderer/src/styles/tokens.css')

/** The value of one custom property inside the first rule whose selector line starts with `selector`. */
function tokenIn(css: string, selector: string, property: string): string {
  const start = css.indexOf(selector)
  expect(start, selector + ' is in tokens.css').toBeGreaterThanOrEqual(0)
  const block = css.slice(start, css.indexOf('}', start))
  // Only spaces around the value (tokens.css is written that way), so the pattern needs no escapes.
  const match = new RegExp(property + ': *(#[0-9a-fA-F]{3,8}) *;').exec(block)
  expect(match, property + ' in ' + selector).not.toBeNull()
  return (match as RegExpExecArray)[1].toLowerCase()
}

describe('window button colours', () => {
  const css = readFileSync(TOKENS, 'utf8')

  // The OS paints these buttons, so they cannot read a CSS variable; if a token changes and this
  // copy does not, the buttons stop matching the bar they sit in and nothing else notices.
  it('dark matches the dark chrome surface and muted text', () => {
    const selector = "html[data-theme='dark']"
    expect(CHROME_COLORS.dark.color).toBe(tokenIn(css, selector, '--surface-chrome'))
    expect(CHROME_COLORS.dark.symbolColor).toBe(tokenIn(css, selector, '--text-muted'))
  })

  it('light matches the light chrome surface and muted text', () => {
    const selector = "html[data-theme='light']"
    expect(CHROME_COLORS.light.color).toBe(tokenIn(css, selector, '--surface-chrome'))
    expect(CHROME_COLORS.light.symbolColor).toBe(tokenIn(css, selector, '--text-muted'))
  })
})
