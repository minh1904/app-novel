import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import * as v from 'valibot'
import type { AppearanceState } from '../../shared/contracts/appearance'

/**
 * Window appearance that main needs before the window exists, kept apart from the library database
 * (which opens later and holds translation data). Today it is only the acrylic switch, off by default
 * as in Hermes Desktop (docs/modules/design-system/hermes-comparison.md).
 */
const FILE_NAME = 'appearance.json'

const fileSchema = v.object({ glass: v.boolean() })

export interface AppearancePrefs {
  glass: boolean
}

export const DEFAULT_APPEARANCE: AppearancePrefs = { glass: false }

export function appearancePath(dataDir: string): string {
  return join(dataDir, FILE_NAME)
}

/** A missing or damaged file is the default, never an error: this file only ever holds a preference. */
export function readAppearance(dataDir: string): AppearancePrefs {
  try {
    const parsed = v.safeParse(
      fileSchema,
      JSON.parse(readFileSync(appearancePath(dataDir), 'utf8'))
    )
    return parsed.success ? { glass: parsed.output.glass } : { ...DEFAULT_APPEARANCE }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

/** Written to a temporary file and renamed over the old one, so a crash mid-write leaves the old value. */
export function writeAppearance(dataDir: string, prefs: AppearancePrefs): void {
  const target = appearancePath(dataDir)
  mkdirSync(dirname(target), { recursive: true })
  const temporary = target + '.tmp'
  writeFileSync(temporary, JSON.stringify({ glass: prefs.glass }) + '\n', 'utf8')
  renameSync(temporary, target)
}

/**
 * Electron's `backgroundMaterial` needs Windows 11 22H2, build 22621 (Hermes apps/shared/src/translucency.ts
 * uses the same floor). `release` is `os.release()`, e.g. "10.0.26200".
 */
export function isGlassSupported(platform: NodeJS.Platform, release: string): boolean {
  if (platform !== 'win32') return false
  const [major, minor, build] = release.split('.').map((part) => Number.parseInt(part, 10))
  if (major !== 10 || minor !== 0 || !Number.isFinite(build)) return major > 10
  return build >= 22621
}

export function appearanceState(prefs: AppearancePrefs, supported: boolean): AppearanceState {
  return { glass: prefs.glass && supported, glassSupported: supported }
}

/** The window options that follow from the switch: the acrylic material and a clear backing, or a solid colour. */
export function windowSurfaceOptions(
  glassOn: boolean,
  solidBackground: string
): { backgroundColor: string; backgroundMaterial?: 'acrylic' } {
  return glassOn
    ? { backgroundColor: '#00000000', backgroundMaterial: 'acrylic' }
    : { backgroundColor: solidBackground }
}
