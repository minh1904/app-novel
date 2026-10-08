import type {
  WorkFixture,
  GlossaryFile,
  PronounsFile,
  ChapterMeta,
  AssertionsFile,
  GlossaryEntry
} from '../shared/contracts/fixture'
import {
  normalizeGlossaryEntries,
  normalizeAssertionRules,
  getWorkId
} from '../shared/contracts/fixture'

export interface ChapterFixtureData {
  id: string
  sourceText: string
  meta: ChapterMeta
  assertions: AssertionsFile
  referenceViText?: string
}

export interface LoadedWorkFixture {
  work: WorkFixture
  isPublic?: boolean
  glossary: GlossaryFile
  pronouns: PronounsFile
  chapters: ChapterFixtureData[]
}

export interface FixtureIssue {
  severity: 'error' | 'warning'
  code: string
  message: string
  chapterId?: string
  ruleIndex?: number
  term?: string
}

/**
 * Splits text into paragraphs according to ADR-005 Q3:
 * A paragraph is every non-empty line after normalizing line breaks to LF.
 * Lines containing only whitespace (including U+3000 ideographic space) are empty.
 */
export function extractParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.replace(/[\s\u3000]/g, '') !== '')
}

/**
 * Normalizes text for comparison (CRLF/CR -> LF, trims whitespace/U+3000 from ends).
 */
export function trimLine(line: string): string {
  return line.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '')
}

interface TermCandidate {
  entryIndex: number
  term: string
}

/**
 * Checks whether all glossary entries appear in the source text of the work using
 * longest-match-first. If a shorter term only appears inside a longer term, it is not counted.
 * For English works ('en'), matching is case-insensitive.
 */
export function findUnmatchedGlossaryEntries(
  entries: GlossaryEntry[],
  allSourceTexts: string[],
  lang: string
): string[] {
  const isEn = lang === 'en'
  const allTerms: TermCandidate[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    allTerms.push({ entryIndex: i, term: isEn ? entry.src.toLowerCase() : entry.src })
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        const aliasSrc = typeof alias === 'string' ? alias : alias.src
        if (aliasSrc) {
          allTerms.push({ entryIndex: i, term: isEn ? aliasSrc.toLowerCase() : aliasSrc })
        }
      }
    }
  }

  // Sort longest term first. If equal length, stable order.
  allTerms.sort((a, b) => b.term.length - a.term.length)

  const matchedEntries = new Set<number>()

  for (const rawText of allSourceTexts) {
    const text = isEn ? rawText.toLowerCase() : rawText
    // Keep track of masked/covered character ranges
    const covered = new Array<boolean>(text.length).fill(false)

    for (const cand of allTerms) {
      if (cand.term.length === 0) continue
      let searchPos = 0
      while (searchPos < text.length) {
        const idx = text.indexOf(cand.term, searchPos)
        if (idx === -1) break

        const endIdx = idx + cand.term.length
        // Check if this range is already covered by a longer match
        let isOccupied = false
        for (let k = idx; k < endIdx; k++) {
          if (covered[k]) {
            isOccupied = true
            break
          }
        }

        if (!isOccupied) {
          for (let k = idx; k < endIdx; k++) {
            covered[k] = true
          }
          matchedEntries.add(cand.entryIndex)
        }

        searchPos = idx + 1
      }
    }
  }

  const unmatched: string[] = []
  for (let i = 0; i < entries.length; i++) {
    if (!matchedEntries.has(i)) {
      unmatched.push(entries[i].src)
    }
  }

  return unmatched
}

/**
 * Pure validation function that inspects a loaded work fixture and returns all issues.
 */
export function checkWorkFixture(fixture: LoadedWorkFixture): FixtureIssue[] {
  const issues: FixtureIssue[] = []
  const { work, isPublic, glossary, pronouns, chapters } = fixture

  // 1. Check license/rights for public fixture
  if (isPublic && !work.rights && !work.license) {
    issues.push({
      severity: 'error',
      code: 'MISSING_RIGHTS',
      message: `Tác phẩm công khai "${getWorkId(work)}" thiếu trường quyền sử dụng (rights hoặc license).`
    })
  }

  // 2. Prepare pronouns pairs set for anchor checking
  const pronounPairs = new Set<string>()
  for (const pair of pronouns.pairs) {
    pronounPairs.add(`${pair.speaker} -> ${pair.listener}`)
  }

  // 3. Check each chapter
  const allSourceTexts: string[] = []

  for (const chapter of chapters) {
    allSourceTexts.push(chapter.sourceText)
    const paragraphs = extractParagraphs(chapter.sourceText)

    // Check paragraph count matches meta.paragraphs
    if (paragraphs.length !== chapter.meta.paragraphs) {
      issues.push({
        severity: 'error',
        code: 'PARAGRAPH_COUNT_MISMATCH',
        chapterId: chapter.id,
        message: `Chương ${chapter.id}: meta.json khai ${chapter.meta.paragraphs} đoạn nhưng source.txt có ${paragraphs.length} đoạn.`
      })
    }

    // Check reference.vi.txt paragraph count if present
    if (chapter.referenceViText !== undefined) {
      const refParagraphs = extractParagraphs(chapter.referenceViText)
      if (refParagraphs.length !== paragraphs.length) {
        issues.push({
          severity: 'error',
          code: 'REFERENCE_PARAGRAPH_MISMATCH',
          chapterId: chapter.id,
          message: `Chương ${chapter.id}: reference.vi.txt có ${refParagraphs.length} đoạn trong khi source.txt có ${paragraphs.length} đoạn.`
        })
      }
    }

    // Check assertions
    const normalizedAssertions = normalizeAssertionRules(chapter.assertions)
    for (let ruleIdx = 0; ruleIdx < normalizedAssertions.rules.length; ruleIdx++) {
      const rule = normalizedAssertions.rules[ruleIdx]

      // Check where anchor
      if (rule.where !== undefined) {
        let matchCount = 0
        for (const p of paragraphs) {
          if (p.includes(rule.where)) {
            matchCount++
          }
        }
        if (matchCount !== 1) {
          issues.push({
            severity: 'error',
            code: 'INVALID_WHERE_ANCHOR',
            chapterId: chapter.id,
            ruleIndex: ruleIdx,
            message: `Chương ${chapter.id}, quy tắc ${ruleIdx + 1}: neo where "${rule.where}" khớp ${matchCount} đoạn (phải khớp đúng 1).`
          })
        }
      }

      // Check line anchor
      if (rule.line !== undefined) {
        if (typeof rule.line === 'string') {
          const expectedTrimmed = trimLine(rule.line)
          const matched = paragraphs.some((p) => trimLine(p) === expectedTrimmed)
          if (!matched) {
            issues.push({
              severity: 'error',
              code: 'INVALID_LINE_ANCHOR',
              chapterId: chapter.id,
              ruleIndex: ruleIdx,
              message: `Chương ${chapter.id}, quy tắc ${ruleIdx + 1}: neo line "${rule.line}" không khớp đoạn nào.`
            })
          }
        } else if (typeof rule.line === 'number') {
          if (rule.line < 1 || rule.line > paragraphs.length) {
            issues.push({
              severity: 'error',
              code: 'INVALID_LINE_INDEX',
              chapterId: chapter.id,
              ruleIndex: ruleIdx,
              message: `Chương ${chapter.id}, quy tắc ${ruleIdx + 1}: chỉ số dòng ${rule.line} nằm ngoài phạm vi 1..${paragraphs.length}.`
            })
          }
        }
      }

      // Check pronoun pair
      if (rule.pair) {
        const [speaker, listener] = rule.pair
        const pairKey = `${speaker} -> ${listener}`
        if (!pronounPairs.has(pairKey)) {
          issues.push({
            severity: 'error',
            code: 'UNKNOWN_PRONOUN_PAIR',
            chapterId: chapter.id,
            ruleIndex: ruleIdx,
            message: `Chương ${chapter.id}, quy tắc ${ruleIdx + 1}: cặp xưng hô ["${speaker}", "${listener}"] không có trong pronouns.json.`
          })
        }
      }
    }
  }

  // 4. Check glossary entries appearance across all chapters
  const normalizedGlossary = normalizeGlossaryEntries(glossary)
  const unmatched = findUnmatchedGlossaryEntries(
    normalizedGlossary.entries,
    allSourceTexts,
    work.lang
  )

  for (const term of unmatched) {
    issues.push({
      severity: 'error',
      code: 'UNMATCHED_GLOSSARY_ENTRY',
      term,
      message: `Mục glossary "${term}" không xuất hiện trong bất kỳ chương nào của tác phẩm.`
    })
  }

  return issues
}
