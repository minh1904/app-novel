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
 * Tách văn bản thành các đoạn:
 * Một đoạn là mỗi dòng không rỗng sau khi chuẩn hóa dấu ngắt dòng thành LF.
 * Các dòng chỉ chứa khoảng trắng (bao gồm cả khoảng trắng ideographic U+3000) được coi là rỗng.
 */
export function extractParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.replace(/[\s\u3000]/g, '') !== '')
}

/**
 * Chuẩn hóa văn bản để so sánh (CRLF/CR -> LF, cắt tỉa khoảng trắng/U+3000 ở hai đầu).
 */
export function trimLine(line: string): string {
  return line.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '')
}

interface TermCandidate {
  entryIndex: number
  term: string
}

/**
 * Kiểm tra xem các mục thuật ngữ có xuất hiện trong văn bản nguồn của tác phẩm hay không
 * bằng thuật toán ưu tiên khớp chuỗi dài nhất trước. Nếu một mục ngắn hơn chỉ xuất hiện
 * bên trong một mục dài hơn, nó sẽ không được tính.
 * Đối với tác phẩm tiếng Anh ('en'), so khớp không phân biệt hoa thường.
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

  // Sắp xếp thuật ngữ dài nhất lên trước. Giữ nguyên thứ tự nếu cùng độ dài.
  allTerms.sort((a, b) => b.term.length - a.term.length)

  const matchedEntries = new Set<number>()

  for (const rawText of allSourceTexts) {
    const text = isEn ? rawText.toLowerCase() : rawText
    // Theo dõi các dải ký tự đã được bao phủ/khớp
    const covered = new Array<boolean>(text.length).fill(false)

    for (const cand of allTerms) {
      if (cand.term.length === 0) continue
      let searchPos = 0
      while (searchPos < text.length) {
        const idx = text.indexOf(cand.term, searchPos)
        if (idx === -1) break

        const endIdx = idx + cand.term.length
        // Kiểm tra xem dải này đã bị khớp bởi một chuỗi dài hơn trước đó chưa
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
 * Hàm kiểm tra tính hợp lệ của fixture tác phẩm đã tải và trả về danh sách các vấn đề phát hiện được.
 */
export function checkWorkFixture(fixture: LoadedWorkFixture): FixtureIssue[] {
  const issues: FixtureIssue[] = []
  const { work, isPublic, glossary, pronouns, chapters } = fixture

  // 1. Kiểm tra bản quyền/giấy phép cho fixture công khai
  if (isPublic && !work.rights && !work.license) {
    issues.push({
      severity: 'error',
      code: 'MISSING_RIGHTS',
      message: `Tác phẩm công khai "${getWorkId(work)}" thiếu trường quyền sử dụng (rights hoặc license).`
    })
  }

  // 2. Chuẩn bị tập hợp các cặp xưng hô để kiểm tra điểm neo
  const pronounPairs = new Set<string>()
  for (const pair of pronouns.pairs) {
    pronounPairs.add(`${pair.speaker} -> ${pair.listener}`)
  }

  // 3. Kiểm tra từng chương
  const allSourceTexts: string[] = []

  for (const chapter of chapters) {
    allSourceTexts.push(chapter.sourceText)
    const paragraphs = extractParagraphs(chapter.sourceText)

    // Kiểm tra số lượng đoạn khớp với meta.paragraphs
    if (paragraphs.length !== chapter.meta.paragraphs) {
      issues.push({
        severity: 'error',
        code: 'PARAGRAPH_COUNT_MISMATCH',
        chapterId: chapter.id,
        message: `Chương ${chapter.id}: meta.json khai ${chapter.meta.paragraphs} đoạn nhưng source.txt có ${paragraphs.length} đoạn.`
      })
    }

    // Kiểm tra số lượng đoạn của reference.vi.txt nếu có
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

    // Kiểm tra các quy tắc kiểm thử (assertions)
    const normalizedAssertions = normalizeAssertionRules(chapter.assertions)
    for (let ruleIdx = 0; ruleIdx < normalizedAssertions.rules.length; ruleIdx++) {
      const rule = normalizedAssertions.rules[ruleIdx]

      // Kiểm tra điểm neo where
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

      // Kiểm tra điểm neo line
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

      // Kiểm tra cặp đại từ xưng hô
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

  // 4. Kiểm tra sự xuất hiện của các mục thuật ngữ trên tất cả các chương
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
