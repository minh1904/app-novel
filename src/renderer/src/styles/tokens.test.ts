import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RENDERER = resolve(__dirname, '..')
const TOKENS = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')

/** Covers draw a letter sized to their box; those sizes are illustration, not interface type. */
const ILLUSTRATION = new Set(['WorkCover.tsx', 'LanguageMark.tsx'])

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : []
  })
}

const files = sources(RENDERER).map((path) => ({
  name: relative(RENDERER, path).replaceAll('\\', '/'),
  text: readFileSync(path, 'utf8')
}))

function offenders(pattern: RegExp, skip: (name: string) => boolean = () => false): string[] {
  return files.flatMap(({ name, text }) =>
    skip(name) ? [] : [...text.matchAll(pattern)].map((match) => name + ': ' + match[0])
  )
}

// docs/modules/design-system: a screen takes type, line height, radius and shadow from the scale in
// tokens.css. A one-off value is how 17 font sizes ended up in use where the scale has five.
describe('design tokens', () => {
  it('uses the type scale, not pixel font sizes', () => {
    const illustration = (name: string): boolean => ILLUSTRATION.has(name.split('/').pop() ?? '')
    expect(offenders(/\btext-\[\d+(\.\d+)?px\]/g, illustration)).toEqual([])
    expect(offenders(/(?<![\w-])text-(xs|sm|base|lg|xl)\b/g)).toEqual([])
  })

  it('uses the named line heights, letter spacing, radii and shadows', () => {
    const illustration = (name: string): boolean => ILLUSTRATION.has(name.split('/').pop() ?? '')
    expect(offenders(/\bleading-\[[^\]]+\]/g)).toEqual([])
    expect(offenders(/\btracking-\[[^\]]+\]/g, illustration)).toEqual([])
    expect(offenders(/\brounded-\[[^\]]+\]/g, illustration)).toEqual([])
    expect(offenders(/\bshadow-\[[^\]]+\]/g)).toEqual([])
  })

  it('stacks surfaces on the z-index ladder, not numbers', () => {
    expect(offenders(/(?<![\w-])z-(\d+|\[[^\]]+\])/g)).toEqual([])
  })

  it('only reads custom properties that tokens.css defines', () => {
    const defined = new Set([...TOKENS.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]))
    const missing = files.flatMap(({ name, text }) =>
      [...text.matchAll(/var\((--[\w-]+)/g)]
        .map((match) => match[1])
        .filter((property) => !defined.has(property))
        .map((property) => name + ': ' + property)
    )
    expect(missing).toEqual([])
  })
})

// docs/modules/design-system/hermes-comparison.md: the parts of Hermes's base layer Mira takes, and the
// one it deliberately does not (story text and answers stay selectable).
describe('base layer', () => {
  it('keeps chrome text unselectable but lets story text and answers opt back in', () => {
    expect(TOKENS).toMatch(/body \{[^}]*user-select: none;/)
    expect(TOKENS).toMatch(/\.selectable\) \{\s*user-select: text;/)
  })

  it('has the hover-only scrollbar, the shared input frame and the glass fallback', () => {
    expect(TOKENS).toContain('*:hover::-webkit-scrollbar-thumb')
    expect(TOKENS).toContain('.input-chrome:focus-within')
    expect(TOKENS).toContain('@media (prefers-reduced-transparency: reduce)')
  })

  it('takes the nous accents for both themes', () => {
    expect(TOKENS).toMatch(/html\[data-theme='light'\] \{[^}]*--seed-accent: #0053fd;/)
    expect(TOKENS).toMatch(/html\[data-theme='dark'\] \{[^}]*--seed-accent: #4a84fe;/)
  })
})
