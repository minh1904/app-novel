/**
 * Tầng kiểm tất định (T0) của lần chạy thử Bộ đo, dùng chung cho `baseline.run.ts` (dịch rồi chấm) và
 * `rescore.run.ts` (chấm lại bản dịch đã lưu khi thêm phép kiểm). Mã tạm, sẽ thành hàm thuần trong
 * `src/shared/algorithms/` ở module Bộ đo.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SourceLanguage } from '../../src/shared/contracts/library'

export interface GlossaryEntry {
  src: string
  tgt: string
  aliases?: Array<{ src: string; tgt: string }>
  alternatives?: string[]
  forbidden?: string[]
}
export interface Rule {
  where?: string
  line?: string
  kind: string
  mustContain?: string[]
  mustContainAny?: string[]
  mustNotContain?: string[]
  mustNotContainWord?: string[]
  dependsOnDraft?: boolean
}
export interface Chapter {
  work: string
  id: string
  lang: SourceLanguage
  source: string
  glossary: GlossaryEntry[]
  rules: Rule[]
  /** Đoạn nguồn chứa một trong các chuỗi này được phép giữ chữ nguồn trong bản dịch (ví dụ chơi chữ trên mặt chữ Hán). */
  residueExempt: string[]
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

export function loadChapters(root: string, only = ''): Chapter[] {
  const chapters: Chapter[] = []
  for (const base of ['fixtures/public', 'fixtures/private']) {
    const dir = join(root, base)
    if (!existsSync(dir)) continue
    for (const work of readdirSync(dir).sort()) {
      const workDir = join(dir, work)
      if (!existsSync(join(workDir, 'work.json'))) continue
      if (only !== '' && !work.includes(only)) continue
      const { lang } = readJson<{ lang: SourceLanguage }>(join(workDir, 'work.json'))
      const glossary = readJson<{ entries: GlossaryEntry[] }>(
        join(workDir, 'glossary.json')
      ).entries
      for (const id of readdirSync(join(workDir, 'chapters')).sort()) {
        const chapterDir = join(workDir, 'chapters', id)
        const meta = readJson<{ checks?: { noSourceScript?: { exemptWhere?: string[] } } }>(
          join(chapterDir, 'meta.json')
        )
        chapters.push({
          work,
          id,
          lang,
          source: readFileSync(join(chapterDir, 'source.txt'), 'utf8'),
          glossary,
          rules: readJson<{ rules: Rule[] }>(join(chapterDir, 'assertions.json')).rules,
          residueExempt: meta.checks?.noSourceScript?.exemptWhere ?? []
        })
      }
    }
  }
  return chapters
}

/** Đoạn = mỗi dòng không trống (ADR-005 Q3); dòng chỉ có khoảng trắng, kể cả U+3000, là trống. */
export const paragraphs = (text: string): string[] =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')

/** So khớp phía tiếng Việt: NFC, chữ thường, và gộp hai kiểu đặt dấu thanh (hoà/hòa, thuý/thúy). */
const TONE_VARIANTS: Array<[RegExp, string]> = [
  [/oà/g, 'òa'],
  [/oá/g, 'óa'],
  [/oả/g, 'ỏa'],
  [/oã/g, 'õa'],
  [/oạ/g, 'ọa'],
  [/oè/g, 'òe'],
  [/oé/g, 'óe'],
  [/oẻ/g, 'ỏe'],
  [/oẽ/g, 'õe'],
  [/oẹ/g, 'ọe'],
  [/uỳ/g, 'ùy'],
  [/uý/g, 'úy'],
  [/uỷ/g, 'ủy'],
  [/uỹ/g, 'ũy'],
  [/uỵ/g, 'ụy']
]
export function vi(text: string): string {
  let out = text.normalize('NFC').toLowerCase()
  for (const [from, to] of TONE_VARIANTS) out = out.replace(from, to)
  return out
}
const hasWord = (haystack: string, word: string): boolean =>
  new RegExp(
    `(?<![\\p{L}\\p{M}])${vi(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`,
    'u'
  ).test(vi(haystack))

const SOURCE_SCRIPT = /[぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿]/u
/** Ngoặc thoại tiếng Nhật/Trung còn trong bản dịch tiếng Việt. */
const CJK_BRACKETS = /[「」『』]/u
/** Dấu câu toàn khổ khác (trừ ＊ ◇ ― dùng làm dấu ngắt cảnh và đổi điểm nhìn). */
const CJK_PUNCTUATION = /[、。！？：；，]/u
const visibleLength = (text: string): number => text.replace(/\s/g, '').length
/** Băng tỷ lệ độ dài (ký tự Việt / ký tự nguồn) khởi điểm: p5–p95 của WMT24++ literary nới ±20% (nghiên cứu, Quan sát 1.3). */
const LENGTH_BAND: Record<SourceLanguage, [number, number]> = {
  'zh-Hans': [1.36, 3.76],
  'zh-Hant': [1.36, 3.76],
  ja: [0.96, 2.71],
  en: [0.6, 1.55]
}

function repeatsTooMuch(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean)
  const counts = new Map<string, number>()
  for (let i = 0; i + 4 <= words.length; i++) {
    const gram = words
      .slice(i, i + 4)
      .join(' ')
      .toLowerCase()
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return [...counts.values()].some((n) => n >= 4)
}

/** Ngoặc mở và đóng không khớp trong một đoạn: ngoặc kép thẳng lẻ, hoặc số ngoặc mở khác số ngoặc đóng. */
function quotesUnbalanced(text: string): boolean {
  const count = (re: RegExp): number => (text.match(re) ?? []).length
  return (
    count(/"/g) % 2 === 1 ||
    count(/“/g) !== count(/”/g) ||
    count(/「/g) !== count(/」/g) ||
    count(/『/g) !== count(/』/g)
  )
}

interface Occurrence {
  owner: string
  expected: string
  lenient: string[]
  forbidden: string[]
}

/** Mục glossary xuất hiện trong một đoạn nguồn, khớp dài trước; nguồn tiếng Anh không phân biệt hoa thường. */
function occurrencesIn(
  paragraph: string,
  glossary: GlossaryEntry[],
  lang: SourceLanguage
): Occurrence[] {
  const fold = lang === 'en' ? (s: string) => s.toLowerCase() : (s: string) => s
  const forms = glossary
    .flatMap((entry) => [
      { src: entry.src, tgt: entry.tgt, entry },
      ...(entry.aliases ?? []).map((alias) => ({ src: alias.src, tgt: alias.tgt, entry }))
    ])
    .sort((a, b) => b.src.length - a.src.length)
  let rest = fold(paragraph)
  const found = new Map<string, Occurrence>()
  for (const form of forms) {
    const needle = fold(form.src)
    if (!rest.includes(needle)) continue
    rest = rest.split(needle).join('\u0000')
    found.set(`${form.entry.src}→${form.tgt}`, {
      owner: form.entry.src,
      expected: form.tgt,
      lenient: [form.tgt, ...(form.entry.alternatives ?? [])],
      forbidden: form.entry.forbidden ?? []
    })
  }
  return [...found.values()]
}

export interface RuleOutcome {
  rule: string
  status: 'pass' | 'fail' | 'skip' | 'manual'
  detail?: string
}

function checkRule(rule: Rule, source: string[], target: string[], aligned: boolean): RuleOutcome {
  const label = rule.line ?? rule.where ?? '?'
  const hasStrings = [
    rule.mustContain,
    rule.mustContainAny,
    rule.mustNotContain,
    rule.mustNotContainWord
  ].some((list) => list !== undefined && list.length > 0)
  if (!hasStrings) return { rule: label, status: 'manual' }
  const index =
    rule.line !== undefined
      ? source.findIndex((p) => p.trim() === rule.line!.trim())
      : source.findIndex((p) => p.includes(rule.where!))
  if (index < 0)
    return { rule: label, status: 'skip', detail: 'không tìm thấy đoạn nguồn sau khi chuẩn hóa' }
  if (!aligned)
    return { rule: label, status: 'skip', detail: 'số đoạn hai bên lệch, không ghép được' }
  const text = vi(target[index] ?? '')
  const missing = (rule.mustContain ?? []).filter((s) => !text.includes(vi(s)))
  const anyOk =
    rule.mustContainAny === undefined || rule.mustContainAny.some((s) => text.includes(vi(s)))
  const banned = (rule.mustNotContain ?? []).filter((s) => text.includes(vi(s)))
  const bannedWords = (rule.mustNotContainWord ?? []).filter((w) => hasWord(target[index] ?? '', w))
  const problems = [
    ...missing.map((s) => `thiếu "${s}"`),
    ...(anyOk ? [] : [`thiếu một trong ${JSON.stringify(rule.mustContainAny)}`]),
    ...[...banned, ...bannedWords].map((s) => `có "${s}"`)
  ]
  return problems.length === 0
    ? { rule: label, status: 'pass' }
    : { rule: label, status: 'fail', detail: problems.join('; ') }
}

/** Quá tỷ lệ này đoạn lệch độ dài thì coi là các đoạn đã trượt vị trí, dù số đoạn hai bên bằng nhau. */
const SHIFT_THRESHOLD = 0.15

export interface Score {
  sourceParagraphs: number
  targetParagraphs: number
  /** Ghép được từng đoạn: số đoạn bằng nhau và không có dấu hiệu trượt vị trí. */
  aligned: boolean
  /** Số đoạn bằng nhau nhưng các đoạn đã trượt vị trí (một dòng mất, một dòng dư). */
  shifted: boolean
  segments: number
  written: number
  residue: number
  residueSamples: string[]
  /** Đoạn còn 「」『』 (nguồn Nhật/Trung). */
  cjkBrackets: number
  /** Đoạn còn 、。！？：；， toàn khổ. */
  cjkPunctuation: number
  /** Đoạn có ngoặc thoại không cân. */
  quoteUnbalanced: number
  quoteSamples: string[]
  /** Kiểu ngoặc thoại của cả chương: ngoặc kép Việt, ngoặc Nhật/Trung, hay lẫn cả hai. */
  dialogueStyle: 'vi' | 'cjk' | 'mixed' | 'none'
  lengthChecked: number
  lengthOutliers: number
  repetition: number
  glossaryChecked: number
  glossaryStrict: number
  glossaryLenient: number
  glossaryMissed: Record<string, number>
  forbiddenHits: number
  glossaryLevel: 'paragraph' | 'chapter'
  rules: RuleOutcome[]
}

export function score(
  chapter: Chapter,
  normalizedSource: string,
  targetText: string,
  segments: number,
  written: number
): Score {
  const source = paragraphs(normalizedSource)
  const target = paragraphs(targetText)
  const sameCount = source.length === target.length
  const cjk = chapter.lang !== 'en'

  // Số đoạn bằng nhau chưa chắc đã ghép đúng: một dòng mất ở chỗ này và một dòng dư ở chỗ khác làm mọi đoạn ở
  // giữa trượt một vị trí. Đoạn lệch độ dài nhiều bất thường là dấu hiệu của việc trượt đó.
  let lengthChecked = 0
  let lengthOutliers = 0
  if (sameCount) {
    const [low, high] = LENGTH_BAND[chapter.lang]
    source.forEach((p, i) => {
      if (visibleLength(p) < 20) return
      lengthChecked++
      const ratio = visibleLength(target[i]) / visibleLength(p)
      if (ratio < low || ratio > high) lengthOutliers++
    })
  }
  const shifted = sameCount && lengthChecked > 0 && lengthOutliers / lengthChecked > SHIFT_THRESHOLD
  const aligned = sameCount && !shifted

  const exempt = (i: number): boolean =>
    aligned && chapter.residueExempt.some((s) => source[i].includes(s))
  const residueParas = cjk ? target.filter((p, i) => SOURCE_SCRIPT.test(p) && !exempt(i)) : []
  const unbalanced = target.filter(quotesUnbalanced)
  const withVi = target.filter((p) => /["“”]/.test(p)).length
  const withCjk = target.filter((p) => CJK_BRACKETS.test(p)).length
  const dialogueStyle =
    withVi === 0 && withCjk === 0 ? 'none' : withCjk === 0 ? 'vi' : withVi === 0 ? 'cjk' : 'mixed'

  const repetition =
    target.filter((p) => repeatsTooMuch(p)).length +
    target.filter((p, i) => i > 0 && p === target[i - 1]).length

  let glossaryChecked = 0
  let glossaryStrict = 0
  let glossaryLenient = 0
  let forbiddenHits = 0
  const glossaryMissed: Record<string, number> = {}
  const tally = (occurrence: Occurrence, text: string): void => {
    glossaryChecked++
    const t = vi(text)
    if (t.includes(vi(occurrence.expected))) glossaryStrict++
    else glossaryMissed[occurrence.owner] = (glossaryMissed[occurrence.owner] ?? 0) + 1
    if (occurrence.lenient.some((s) => t.includes(vi(s)))) glossaryLenient++
    if (occurrence.forbidden.some((s) => hasWord(text, s))) forbiddenHits++
  }
  if (aligned) {
    source.forEach((p, i) =>
      occurrencesIn(p, chapter.glossary, chapter.lang).forEach((o) => tally(o, target[i]))
    )
  } else {
    occurrencesIn(source.join('\n'), chapter.glossary, chapter.lang).forEach((o) =>
      tally(o, target.join('\n'))
    )
  }

  return {
    sourceParagraphs: source.length,
    targetParagraphs: target.length,
    aligned,
    shifted,
    segments,
    written,
    residue: residueParas.length,
    residueSamples: residueParas.slice(0, 5).map((p) => p.slice(0, 120)),
    cjkBrackets: cjk ? withCjk : 0,
    cjkPunctuation: cjk ? target.filter((p) => CJK_PUNCTUATION.test(p)).length : 0,
    quoteUnbalanced: unbalanced.length,
    quoteSamples: unbalanced.slice(0, 5).map((p) => p.slice(0, 160)),
    dialogueStyle,
    lengthChecked,
    lengthOutliers,
    repetition,
    glossaryChecked,
    glossaryStrict,
    glossaryLenient,
    glossaryMissed,
    forbiddenHits,
    glossaryLevel: aligned ? 'paragraph' : 'chapter',
    rules: chapter.rules.map((rule) => checkRule(rule, source, target, aligned))
  }
}

export const pct = (part: number, whole: number): string =>
  whole === 0 ? '—' : `${Math.round((100 * part) / whole)}%`

/** Gộp các lần chạy của một chương thành một dòng báo cáo. */
export function summarize(
  chapter: Chapter,
  scores: Score[],
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const sum = (pick: (s: Score) => number): number => scores.reduce((t, s) => t + pick(s), 0)
  const rules = scores.flatMap((s) => s.rules)
  const missed: Record<string, number> = {}
  for (const s of scores)
    for (const [k, n] of Object.entries(s.glossaryMissed)) missed[k] = (missed[k] ?? 0) + n
  return {
    chapter: `${chapter.work}/${chapter.id}`,
    lang: chapter.lang,
    runs: scores.length,
    sourceParagraphs: scores[0]?.sourceParagraphs ?? 0,
    targetParagraphs: scores.map((s) => s.targetParagraphs),
    aligned:
      `${scores.filter((s) => s.aligned).length}/${scores.length}` +
      (scores.some((s) => s.shifted) ? ` (trượt ${scores.filter((s) => s.shifted).length})` : ''),
    untranslatedSegments: sum((s) => s.segments - s.written),
    residue: sum((s) => s.residue),
    cjkBrackets: scores.map((s) => s.cjkBrackets),
    cjkPunctuation: scores.map((s) => s.cjkPunctuation),
    quoteUnbalanced: scores.map((s) => s.quoteUnbalanced),
    dialogueStyle: scores.map((s) => s.dialogueStyle),
    lengthOutliers: `${sum((s) => s.lengthOutliers)}/${sum((s) => s.lengthChecked)}`,
    repetition: sum((s) => s.repetition),
    glossaryStrict: pct(
      sum((s) => s.glossaryStrict),
      sum((s) => s.glossaryChecked)
    ),
    glossaryLenient: pct(
      sum((s) => s.glossaryLenient),
      sum((s) => s.glossaryChecked)
    ),
    glossaryChecked: sum((s) => s.glossaryChecked),
    glossaryMostMissed: Object.entries(missed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
    forbiddenHits: sum((s) => s.forbiddenHits),
    rules: {
      pass: rules.filter((r) => r.status === 'pass').length,
      fail: rules.filter((r) => r.status === 'fail').length,
      skip: rules.filter((r) => r.status === 'skip').length,
      manual: rules.filter((r) => r.status === 'manual').length
    },
    failedRules: [
      ...new Set(
        rules.filter((r) => r.status === 'fail').map((r) => `${r.rule.slice(0, 40)} → ${r.detail}`)
      )
    ].slice(0, 8),
    ...extra
  }
}

/** Bảng Markdown của báo cáo; không chứa văn bản truyện. */
export function reportTable(title: string, rows: Array<Record<string, unknown>>): string {
  const header =
    '| Chương | Đoạn nguồn | Đoạn dịch (mỗi lần) | Khớp | Câu chưa dịch | Sót chữ nguồn | Còn 「」『』 | Còn 、。！？ | Ngoặc lệch | Kiểu thoại | Độ dài lệch | Lặp | Glossary đúng / chấp nhận được | Term cấm | Quy tắc đạt/trượt/bỏ qua/tay | Token | Giây |'
  const line = (s: Record<string, unknown>): string =>
    `| ${s.chapter} | ${s.sourceParagraphs} | ${(s.targetParagraphs as number[]).join(', ')} | ${s.aligned} | ${s.untranslatedSegments} | ${s.residue} | ${(s.cjkBrackets as number[]).join(', ')} | ${(s.cjkPunctuation as number[]).join(', ')} | ${(s.quoteUnbalanced as number[]).join(', ')} | ${(s.dialogueStyle as string[]).join(', ')} | ${s.lengthOutliers} | ${s.repetition} | ${s.glossaryStrict} / ${s.glossaryLenient} (${s.glossaryChecked}) | ${s.forbiddenHits} | ${Object.values(s.rules as Record<string, number>).join('/')} | ${s.usage === undefined ? '—' : JSON.stringify(s.usage)} | ${s.seconds ?? '—'} |`
  return [title, '', header, `|${' --- |'.repeat(17)}`, ...rows.map(line), ''].join('\n')
}
