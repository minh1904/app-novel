import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  appearancePath,
  isGlassSupported,
  readAppearance,
  windowSurfaceOptions,
  writeAppearance
} from './appearance'
import { createAppearanceHandlers, type GlassWindow } from './appearanceIpc'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mira-appearance-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('appearance.json', () => {
  it('is off when the file is missing', () => {
    expect(readAppearance(dir)).toEqual({ glass: false })
  })

  it('is off when the file is damaged or has the wrong shape', () => {
    writeFileSync(appearancePath(dir), '{ glass: tru')
    expect(readAppearance(dir)).toEqual({ glass: false })
    writeFileSync(appearancePath(dir), JSON.stringify({ glass: 'yes' }))
    expect(readAppearance(dir)).toEqual({ glass: false })
  })

  it('reads back what was written', () => {
    writeAppearance(dir, { glass: true })
    expect(readAppearance(dir)).toEqual({ glass: true })
    expect(JSON.parse(readFileSync(appearancePath(dir), 'utf8'))).toEqual({ glass: true })
  })
})

describe('glass support', () => {
  it('needs Windows 11 build 22621 or later', () => {
    expect(isGlassSupported('win32', '10.0.19045')).toBe(false)
    expect(isGlassSupported('win32', '10.0.22000')).toBe(false)
    expect(isGlassSupported('win32', '10.0.22621')).toBe(true)
    expect(isGlassSupported('win32', '10.0.26200')).toBe(true)
  })

  it('is off outside Windows and on a release it cannot read', () => {
    expect(isGlassSupported('darwin', '24.0.0')).toBe(false)
    expect(isGlassSupported('linux', '6.8.0')).toBe(false)
    expect(isGlassSupported('win32', 'unknown')).toBe(false)
  })
})

describe('window surface options', () => {
  it('asks for acrylic behind a clear window when glass is on', () => {
    expect(windowSurfaceOptions(true, '#0d1015')).toEqual({
      backgroundColor: '#00000000',
      backgroundMaterial: 'acrylic'
    })
  })

  it('keeps the solid theme colour when glass is off', () => {
    expect(windowSurfaceOptions(false, '#0d1015')).toEqual({ backgroundColor: '#0d1015' })
  })
})

describe('appearance IPC', () => {
  function setup(
    supported: boolean,
    trusted = true
  ): { handlers: ReturnType<typeof createAppearanceHandlers<string>>; calls: string[] } {
    const calls: string[] = []
    const window: GlassWindow = {
      setBackgroundMaterial: (material) => calls.push('material:' + material),
      setBackgroundColor: (color) => calls.push('color:' + color)
    }
    const handlers = createAppearanceHandlers<string>({
      dataDir: dir,
      supported,
      isTrusted: (event) => trusted && event === 'mira',
      getWindow: () => window,
      solidBackground: () => '#fefefe'
    })
    return { handlers, calls }
  }

  it('refuses a sender that is not the Mira window', () => {
    const { handlers } = setup(true)
    expect(() => handlers.get('other')).toThrow('Untrusted IPC sender')
    expect(() => handlers.set('other', { glass: true })).toThrow('Untrusted IPC sender')
    expect(readAppearance(dir)).toEqual({ glass: false })
  })

  it('saves the switch and redraws the window at once', () => {
    const { handlers, calls } = setup(true)
    expect(handlers.set('mira', { glass: true })).toEqual({ glass: true, glassSupported: true })
    expect(readAppearance(dir)).toEqual({ glass: true })
    expect(calls).toEqual(['material:acrylic', 'color:#00000000'])

    calls.length = 0
    expect(handlers.set('mira', { glass: false })).toEqual({ glass: false, glassSupported: true })
    expect(calls).toEqual(['material:none', 'color:#fefefe'])
  })

  it('reports glass off and leaves the window alone where it is not supported', () => {
    const { handlers, calls } = setup(false)
    expect(handlers.set('mira', { glass: true })).toEqual({ glass: false, glassSupported: false })
    expect(calls).toEqual([])
    expect(handlers.get('mira')).toEqual({ glass: false, glassSupported: false })
  })

  it('rejects input that is not a yes or no', () => {
    const { handlers } = setup(true)
    expect(() => handlers.set('mira', { glass: 'on' })).toThrow()
  })
})
