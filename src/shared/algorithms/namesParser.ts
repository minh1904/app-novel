export interface ParsedNameEntry {
  line: number
  source: string
  target: string
  raw: string
}

export type SkippedReason =
  | 'comment'
  | 'empty'
  | 'missing_delimiter'
  | 'empty_source'
  | 'empty_target'
  | 'duplicate_source'

export interface SkippedNameLine {
  line: number
  raw: string
  reason: SkippedReason
}

export interface ParseNamesResult {
  entries: ParsedNameEntry[]
  skipped: SkippedNameLine[]
}

/**
 * Parses Names.txt formatted text (source=target per line).
 * Ignores empty lines, comments (#, //), and records malformed or duplicate lines.
 */
export function parseNamesText(content: string): ParseNamesResult {
  const lines = content.split(/\r?\n/)
  const entries: ParsedNameEntry[] = []
  const skipped: SkippedNameLine[] = []
  const seenSources = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const raw = lines[i]
    const trimmed = raw.trim()

    if (trimmed.length === 0) {
      skipped.push({ line: lineNumber, raw, reason: 'empty' })
      continue
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
      skipped.push({ line: lineNumber, raw, reason: 'comment' })
      continue
    }

    const eqIndex = raw.indexOf('=')
    if (eqIndex === -1) {
      skipped.push({ line: lineNumber, raw, reason: 'missing_delimiter' })
      continue
    }

    const source = raw.slice(0, eqIndex).trim()
    const target = raw.slice(eqIndex + 1).trim()

    if (source.length === 0) {
      skipped.push({ line: lineNumber, raw, reason: 'empty_source' })
      continue
    }

    if (target.length === 0) {
      skipped.push({ line: lineNumber, raw, reason: 'empty_target' })
      continue
    }

    const sourceKey = source.toLowerCase()
    if (seenSources.has(sourceKey)) {
      skipped.push({ line: lineNumber, raw, reason: 'duplicate_source' })
      continue
    }

    seenSources.add(sourceKey)
    entries.push({
      line: lineNumber,
      source,
      target,
      raw
    })
  }

  return { entries, skipped }
}
