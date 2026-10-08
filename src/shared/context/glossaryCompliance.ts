import type {
  ContextEntryItem,
  GlossaryComplianceIssue,
  GlossaryComplianceReport
} from '../contracts/glossary'
import { matchContextEntries } from './contextMatching'
import { containsWord } from '../translation/translationChecks'

export type { GlossaryComplianceIssue, GlossaryComplianceReport }

/**
 * Checks whether translated target text complies with the active glossary.
 * - Missing target: When an approved term appears in the source text, but its target form is missing in translation.
 * - Forbidden used: When a forbidden term's target appears anywhere in the translated text.
 */
export function evaluateGlossaryCompliance(
  sourceText: string,
  targetText: string,
  entries: ContextEntryItem[],
  sourceLang: string
): GlossaryComplianceReport {
  const issues: GlossaryComplianceIssue[] = []

  // Privacy & relevance: only check approved entries
  const approvedEntries = entries.filter((e) => e.status === 'approved')

  const regularEntries: ContextEntryItem[] = []
  const forbiddenEntries: ContextEntryItem[] = []

  for (const entry of approvedEntries) {
    if (entry.forbidden) {
      forbiddenEntries.push(entry)
    } else {
      regularEntries.push(entry)
    }
  }

  // 1. Check forbidden terms in target text
  for (const forbidden of forbiddenEntries) {
    if (containsWord(targetText, forbidden.target)) {
      issues.push({
        type: 'forbidden_used',
        entryId: forbidden.id,
        source: forbidden.source,
        term: forbidden.target,
        message: `Bản dịch chứa thuật ngữ bị cấm: "${forbidden.target}".`
      })
    }
  }

  // 2. Check source occurrences and expected targets
  const matched = matchContextEntries(sourceText, regularEntries, sourceLang)

  for (const item of matched) {
    const entry = item.entry
    if (!containsWord(targetText, entry.target)) {
      issues.push({
        type: 'missing_target',
        entryId: entry.id,
        source: entry.source,
        term: entry.target,
        message: `Thuật ngữ "${entry.source}" xuất hiện ở bản gốc nhưng thiếu bản dịch "${entry.target}".`
      })
    }
  }

  return {
    checkedCount: approvedEntries.length,
    matchedCount: matched.length,
    issues,
    hasIssues: issues.length > 0
  }
}
