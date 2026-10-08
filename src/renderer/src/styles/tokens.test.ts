import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RENDERER = resolve(__dirname, '..')
const STYLES = __dirname

function walk(dir: string, match: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path, match)
    return match.test(entry.name) && !entry.name.includes('.test.') ? [path] : []
  })
}

// Working files are CRLF; the checks below match on `\n`.
const read = (path: string): string => readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
const CSS = walk(STYLES, /\.css$/)
  .map(read)
  .join('\n')
const FOUNDATION = read(resolve(STYLES, 'tokens/foundation.css'))
const SEMANTIC = read(resolve(STYLES, 'tokens/semantic.css'))
const COMPONENT = read(resolve(STYLES, 'tokens/component.css'))

/** Covers draw a letter sized to their box; those sizes are illustration, not interface type. */
const ILLUSTRATION = new Set(['WorkCover.tsx', 'LanguageMark.tsx'])

const files = walk(RENDERER, /\.tsx?$/).map((path) => ({
  name: relative(RENDERER, path).replaceAll('\\', '/'),
  text: read(path)
}))

function offenders(pattern: RegExp, skip: (name: string) => boolean = () => false): string[] {
  return files.flatMap(({ name, text }) =>
    skip(name) ? [] : [...text.matchAll(pattern)].map((match) => name + ': ' + match[0])
  )
}

const illustration = (name: string): boolean => ILLUSTRATION.has(name.split('/').pop() ?? '')

// docs/modules/design-system/README.md: a screen takes type, line height, radius, shadow, icon size and
// stacking from the scales; a one-off value is how 17 font sizes ended up in use where a scale had five.
describe('screens use the scales', () => {
  it('uses the type styles, not pixel font sizes', () => {
    expect(offenders(/\btext-\[\d+(\.\d+)?px\]/g, illustration)).toEqual([])
    expect(offenders(/(?<![\w-])text-(xs|sm|base|lg|xl|ui-[\w-]+)\b/g)).toEqual([])
  })

  it('uses the named line heights, letter spacing, radii and shadows', () => {
    expect(offenders(/\bleading-\[[^\]]+\]/g)).toEqual([])
    expect(offenders(/\btracking-\[[^\]]+\]/g, illustration)).toEqual([])
    expect(offenders(/\brounded-\[[^\]]+\]/g, illustration)).toEqual([])
    expect(offenders(/\bshadow-\[[^\]]+\]/g)).toEqual([])
  })

  it('sizes icons on the Obsidian scale (12, 14, 16, 18, 24)', () => {
    const sizes = new Set(['12', '14', '16', '18', '24'])
    const off = files.flatMap(({ name, text }) =>
      // `\s+`: the formatter puts `size` on its own line when the props do not fit on one.
      [...text.matchAll(/Icon\s+size=\{(\d+)\}/g)]
        .filter((match) => !sizes.has(match[1]))
        .map((match) => name + ': ' + match[0].replace(/\s+/, ' '))
    )
    expect(off).toEqual([])
  })

  it('stacks surfaces on the z-index ladder, not numbers', () => {
    expect(offenders(/(?<![\w-])z-(\d+|\[[^\]]+\])/g)).toEqual([])
  })

  it('does not use the old Hermes and paper names', () => {
    const old =
      /(?<![\w-])(?:bg-(?:canvas|chrome|raised|elevated|popover|sidebar|bubble|control|tertiary|active|primary)|text-ink[\w-]*|border-line[\w-]*|rounded-(?:item|control|tab|badge|panel|icon|sheet))(?![\w-])/g
    expect(offenders(old)).toEqual([])
  })

  it('only reads custom properties the styles define', () => {
    const defined = new Set([...CSS.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]))
    const missing = files.flatMap(({ name, text }) =>
      [...text.matchAll(/var\((--[\w-]+)|\((--mira-[\w-]+)\)/g)]
        .map((match) => match[1] ?? match[2])
        .filter((property) => !defined.has(property))
        .map((property) => name + ': ' + property)
    )
    expect(missing).toEqual([])
  })

  it('reads component tokens only inside components/ui', () => {
    const componentTokens = [...COMPONENT.matchAll(/(--mira-[\w-]+)\s*:/g)].map((m) => m[1])
    const leaks = files
      .filter(({ name }) => !name.startsWith('components/ui/') && name !== 'app/AppShell.tsx')
      .flatMap(({ name, text }) =>
        componentTokens.filter((token) => text.includes(token)).map((token) => name + ': ' + token)
      )
    expect(leaks).toEqual([])
  })
})

/** The opening tag that starts at `start`, skipping `>` inside braces (`onChange={(e) => …}`). */
function openingTag(text: string, start: number): string {
  let depth = 0
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') depth--
    else if (text[i] === '>' && depth === 0) return text.slice(start, i + 1)
  }
  return text.slice(start)
}

/** Editors whose writing surface is a bare textarea inside a frame of their own. */
const EDITOR_SURFACES = new Set([
  'features/chapter/SentenceMode.tsx',
  'features/chapter/chat/AiComposer.tsx'
])

const CONTROLS =
  /<(Button|LinkButton|CompactButton|ButtonGroup|Input|SearchInput|TextField|TextareaField|Select)(?=[\s/>])/g

// docs/modules/design-system/README.md: a screen builds controls from components/ui, as in the IZONE LMS
// system; a hand-styled button is how one bar ended up with four heights. Every control takes md.
describe('screens use the shared controls', () => {
  const screens = files.filter(
    ({ name }) => !name.startsWith('components/ui/') && !name.includes('.test.')
  )

  it('does not hand-write buttons, fields or selects', () => {
    const off = screens.flatMap(({ name, text }) =>
      [...text.matchAll(/<(button|input|textarea|select)\b/g)]
        .map((match) => ({ tag: match[1], source: openingTag(text, match.index) }))
        .filter(({ tag, source }) => {
          if (tag === 'input' && /type="file"/.test(source)) return false
          if (tag === 'textarea' && EDITOR_SURFACES.has(name)) return false
          return true
        })
        .map(({ tag }) => name + ': <' + tag + '>')
    )
    expect(off).toEqual([])
  })

  it('gives every control the default md size', () => {
    const off = screens.flatMap(({ name, text }) =>
      [...text.matchAll(CONTROLS)]
        .map((match) => openingTag(text, match.index))
        .filter((source) => /\ssize="(sm|lg)"/.test(source))
        .map((source) => name + ': ' + source.split(/\s/)[0])
    )
    expect(off).toEqual([])
  })
})

// The three tiers point one way: semantic reads foundation, component reads semantic.
describe('token tiers', () => {
  it('keeps raw colours in the foundation tier', () => {
    expect(SEMANTIC).not.toMatch(/:\s*#[0-9a-f]{3,8}/i)
    expect(COMPONENT).not.toMatch(/:\s*#[0-9a-f]{3,8}/i)
  })

  it('lets semantic tokens read only foundation tokens', () => {
    const foundation = new Set([...FOUNDATION.matchAll(/(--mira-[\w-]+)\s*:/g)].map((m) => m[1]))
    const reads = [...SEMANTIC.matchAll(/var\((--mira-[\w-]+)\)/g)].map((m) => m[1])
    expect(reads.filter((name) => !foundation.has(name))).toEqual([])
  })

  it('defines every semantic token in both themes', () => {
    const block = (selector: string): Set<string> => {
      const start = SEMANTIC.indexOf(selector)
      const body = SEMANTIC.slice(start, SEMANTIC.indexOf('\n}', start))
      return new Set([...body.matchAll(/(--mira-[\w-]+)\s*:/g)].map((m) => m[1]))
    }
    const light = block(":root,\nhtml[data-theme='light']")
    const dark = block("html[data-theme='dark']")
    expect([...light].filter((name) => !dark.has(name))).toEqual([])
    expect([...dark].filter((name) => !light.has(name))).toEqual([])
  })
})

// docs/modules/design-system/README.md: chrome text is not selectable; story text and answers are.
describe('base layer', () => {
  it('keeps chrome text unselectable but lets story text and answers opt back in', () => {
    expect(CSS).toMatch(/body \{[^}]*user-select: none;/)
    expect(CSS).toMatch(/\.selectable\) \{\s*user-select: text;/)
  })

  it('has the hover-only scrollbar', () => {
    expect(CSS).toContain('*:hover::-webkit-scrollbar-thumb')
  })

  it('switches off Tailwind’s own colours, radii, type sizes and shadows', () => {
    for (const namespace of ['color', 'radius', 'text', 'shadow']) {
      expect(CSS).toContain('--' + namespace + '-*: initial;')
    }
  })
})
