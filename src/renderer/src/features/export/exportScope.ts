import type { ChapterItem } from '../../../../shared/contracts/chapters'
import {
  EXPORT_FORMATS,
  EXPORT_PAGE_SIZES,
  EXPORT_PARAGRAPH_SPACINGS,
  EXPORT_WORK_MODES,
  type ExportFormat,
  type ExportPageSize,
  type ExportParagraphSpacing,
  type ExportWorkMode
} from '../../../../shared/contracts/export'

/** Which chapters an export of the work takes. */
export type ExportScope =
  | { kind: 'all' }
  | { kind: 'range'; from: number; to: number }
  | { kind: 'selected'; ids: ReadonlySet<string> }

export interface ScopePlan {
  /** Chapters that will be written, in order. */
  included: ChapterItem[]
  /** Chapters in the scope that are left out for having no translation. */
  skipped: ChapterItem[]
}

/** The chapters of `scope`, split into those with a translation and those without. */
export function planScope(chapters: readonly ChapterItem[], scope: ExportScope): ScopePlan {
  const inScope = chapters.filter((chapter) => {
    if (scope.kind === 'all') return true
    if (scope.kind === 'selected') return scope.ids.has(chapter.id)
    const low = Math.min(scope.from, scope.to)
    const high = Math.max(scope.from, scope.to)
    return chapter.number >= low && chapter.number <= high
  })
  return {
    included: inScope.filter((chapter) => chapter.hasTarget),
    skipped: inScope.filter((chapter) => !chapter.hasTarget)
  }
}

/** "3, 7, 12–15": chapter numbers with runs folded, cut after `limit` pieces. */
export function foldNumbers(numbers: readonly number[], limit = 8): string {
  const sorted = [...numbers].sort((a, b) => a - b)
  const runs: Array<{ text: string; size: number }> = []
  for (let index = 0; index < sorted.length; ) {
    let end = index
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) end += 1
    runs.push({
      text: end === index ? String(sorted[index]) : sorted[index] + '–' + sorted[end],
      size: end - index + 1
    })
    index = end + 1
  }
  const shown = runs.slice(0, limit)
  const text = shown.map((run) => run.text).join(', ')
  if (runs.length <= limit) return text
  const rest = runs.slice(limit).reduce((sum, run) => sum + run.size, 0)
  return text + ' và ' + rest + ' chương khác'
}

/** The export choices that carry over from one export to the next on this device. */
export interface ExportPrefs {
  format: ExportFormat
  workMode: ExportWorkMode
  pageSize: ExportPageSize
  paragraphSpacing: ExportParagraphSpacing
  includeTitle: boolean
  includeDescription: boolean
}

export const DEFAULT_EXPORT_PREFS: ExportPrefs = {
  format: 'docx',
  workMode: 'combined',
  pageSize: 'A5',
  paragraphSpacing: 'indent',
  includeTitle: true,
  includeDescription: true
}

const PREFS_KEY = 'mira.exportPrefs'

const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

const flag = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

/** A per-device convenience: storage that throws, is empty or holds junk gives the defaults. */
export function readExportPrefs(): ExportPrefs {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PREFS_KEY)
    const saved: unknown = raw ? JSON.parse(raw) : null
    if (typeof saved !== 'object' || saved === null) return DEFAULT_EXPORT_PREFS
    const value = saved as Record<string, unknown>
    const d = DEFAULT_EXPORT_PREFS
    return {
      format: pick(EXPORT_FORMATS, value.format, d.format),
      workMode: pick(EXPORT_WORK_MODES, value.workMode, d.workMode),
      pageSize: pick(EXPORT_PAGE_SIZES, value.pageSize, d.pageSize),
      paragraphSpacing: pick(EXPORT_PARAGRAPH_SPACINGS, value.paragraphSpacing, d.paragraphSpacing),
      includeTitle: flag(value.includeTitle, d.includeTitle),
      includeDescription: flag(value.includeDescription, d.includeDescription)
    }
  } catch {
    return DEFAULT_EXPORT_PREFS
  }
}

export function writeExportPrefs(prefs: ExportPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Not saved: the next export starts from the defaults again.
  }
}
