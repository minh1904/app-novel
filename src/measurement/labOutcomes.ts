/**
 * Kết cục từng đoạn của một lần dịch Lab, và hai trục báo cáo dựng trên đó (change
 * `lab-completion-quality-report`).
 *
 * - **Hoàn thành** tính trên toàn tập định dịch, không loại đoạn nào.
 * - **Chất lượng** chỉ tính trên các đoạn `translated` ở mọi biến thể đang so: một đoạn bị chặn ở một
 *   bản bị loại khỏi phần này ở cả hai bản, không bị tính là 0 điểm.
 *
 * Hàm thuần, không đọc tệp; Lab (`scripts/lab/cli.ts`) đọc và ghi.
 */

/**
 * `budget_exhausted`: đoạn không được gửi hoặc không được hỏi lại vì ngân sách lời gọi của lượt đã hết
 * (change `translation-call-budget`). Tách khỏi `missing` vì thử lại có ích và vì nó nói về cấu hình
 * ngân sách, không về model.
 */
export const OUTCOMES = [
  'translated',
  'refused',
  'missing',
  'request_error',
  'budget_exhausted',
  'not_run'
] as const
export type ParagraphOutcome = (typeof OUTCOMES)[number]
export type OutcomeCounts = Record<ParagraphOutcome, number>

/** Một dòng tệp `<ncode>-<variant>.outcomes.jsonl`: kết cục mọi đoạn định dịch của một chương. */
export interface ChapterOutcomes {
  chapter: number
  /** Id đoạn → kết cục. Id đoạn suy từ thứ tự và chữ của bản gốc, nên các bản sao cùng bản gốc chung id. */
  ids: Record<string, ParagraphOutcome>
  /** Lý do cho đoạn `refused` (chữ gốc của nhà cung cấp) và `request_error` (loại lỗi). */
  reasons?: Record<string, string>
}

/** Những gì kết quả một lô cần có; trùng với `ParagraphBatchResult`. */
export interface BatchOutcomeInput {
  proposed: string[]
  failed: string[]
  refusals: Array<{ id: string; group: string; raw: string }>
  /** Đoạn hết ngân sách lời gọi; thiếu ở kết quả cũ. */
  budgetIds?: string[]
  error: { kind: string } | null
}

/**
 * Đọc tệp `.outcomes.jsonl`: dòng hỏng (ghi dở khi tiến trình bị ngắt) bị bỏ qua; một chương ghi nhiều
 * lần thì dòng sau thắng.
 */
export function parseOutcomeLines(text: string): Map<number, ChapterOutcomes> {
  const out = new Map<number, ChapterOutcomes>()
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    try {
      const parsed = JSON.parse(line) as ChapterOutcomes
      if (typeof parsed.chapter === 'number' && parsed.ids && typeof parsed.ids === 'object') {
        out.set(parsed.chapter, parsed)
      }
    } catch {
      // dòng ghi dở
    }
  }
  return out
}

export function emptyCounts(): OutcomeCounts {
  return {
    translated: 0,
    refused: 0,
    missing: 0,
    request_error: 0,
    budget_exhausted: 0,
    not_run: 0
  }
}

/**
 * Kết cục của các đoạn một lô định dịch. Đoạn có bản dịch là `translated`; đoạn bộ lọc chặn là `refused`
 * (lý do là chữ gốc, hoặc nhóm khi nhà cung cấp không nêu); lỗi `invalid_request` của cả lô là
 * `request_error`; đoạn hết ngân sách lời gọi là `budget_exhausted`; phần còn lại trong `failed`, hoặc
 * không được nhắc tới, là `missing`.
 */
export function batchOutcomes(
  plannedIds: string[],
  result: BatchOutcomeInput
): { ids: Record<string, ParagraphOutcome>; reasons: Record<string, string> } {
  const ids: Record<string, ParagraphOutcome> = {}
  const reasons: Record<string, string> = {}
  const proposed = new Set(result.proposed)
  const refused = new Map(result.refusals.map((item) => [item.id, item.raw || item.group]))
  const requestError = result.error?.kind === 'invalid_request'
  const unsent = new Set(result.budgetIds ?? [])
  for (const id of plannedIds) {
    if (proposed.has(id)) ids[id] = 'translated'
    else if (refused.has(id)) {
      ids[id] = 'refused'
      reasons[id] = refused.get(id)!
    } else if (unsent.has(id)) {
      ids[id] = 'budget_exhausted'
    } else if (requestError) {
      ids[id] = 'request_error'
      reasons[id] = 'invalid_request'
    } else ids[id] = 'missing'
  }
  return { ids, reasons }
}

/** Mọi đoạn của một chương mà lần chạy không tới được. */
export function notRunChapter(chapter: number, plannedIds: string[]): ChapterOutcomes {
  return { chapter, ids: Object.fromEntries(plannedIds.map((id) => [id, 'not_run'])) }
}

export function countOutcomes(chapters: ChapterOutcomes[]): OutcomeCounts {
  const counts = emptyCounts()
  for (const chapter of chapters) {
    for (const outcome of Object.values(chapter.ids)) counts[outcome]++
  }
  return counts
}

/** Số đoạn `refused` theo lý do, để phần Hoàn thành nói bị chặn vì gì. */
export function refusalReasons(chapters: ChapterOutcomes[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const chapter of chapters) {
    for (const [id, outcome] of Object.entries(chapter.ids)) {
      if (outcome !== 'refused') continue
      const reason = chapter.reasons?.[id] || 'không rõ'
      out[reason] = (out[reason] ?? 0) + 1
    }
  }
  return out
}

/** Khóa so sánh một đoạn giữa các bản: chương và id đoạn (id đã mang thứ tự trong bản gốc). */
export const paragraphKey = (chapter: number, id: string): string => `${chapter}:${id}`

export interface Comparable {
  /** Khóa có `translated` ở mọi biến thể. */
  keys: Set<string>
  /** Tổng số khóa định dịch (hợp các biến thể). */
  total: number
  /** Theo biến thể: số đoạn bị loại vì kết cục của **biến thể đó** không phải `translated`. */
  excluded: Record<string, Partial<OutcomeCounts>>
}

/**
 * Tập đoạn so được giữa các biến thể. Một biến thể không có dòng cho chương thì mọi đoạn của chương đó
 * coi như `not_run` ở biến thể ấy.
 */
export function comparableKeys(byVariant: Record<string, ChapterOutcomes[]>): Comparable {
  const variants = Object.keys(byVariant)
  const maps = Object.fromEntries(
    variants.map((variant) => {
      const map = new Map<string, ParagraphOutcome>()
      for (const chapter of byVariant[variant]) {
        for (const [id, outcome] of Object.entries(chapter.ids)) {
          map.set(paragraphKey(chapter.chapter, id), outcome)
        }
      }
      return [variant, map]
    })
  )
  const all = new Set(variants.flatMap((variant) => [...maps[variant].keys()]))
  const keys = new Set<string>()
  const excluded: Comparable['excluded'] = Object.fromEntries(variants.map((v) => [v, {}]))
  for (const key of all) {
    let everywhere = variants.length > 0
    for (const variant of variants) {
      const outcome = maps[variant].get(key) ?? 'not_run'
      if (outcome === 'translated') continue
      everywhere = false
      excluded[variant][outcome] = (excluded[variant][outcome] ?? 0) + 1
    }
    if (everywhere) keys.add(key)
  }
  return { keys, total: all.size, excluded }
}

/** “loại N đoạn: A refused 1, B missing 2” — dòng báo cáo đi kèm phần Chất lượng. */
export function exclusionLine(comparable: Comparable): string {
  const dropped = comparable.total - comparable.keys.size
  if (comparable.total > 0 && comparable.keys.size === 0) {
    return 'Không có đoạn chung để so: không đưa ra chỉ số chất lượng.'
  }
  if (dropped === 0) return `Chất lượng đo trên cả ${comparable.total} đoạn; không loại đoạn nào.`
  const parts = Object.entries(comparable.excluded).flatMap(([variant, counts]) =>
    OUTCOMES.filter((o) => (counts[o] ?? 0) > 0).map((o) => `${variant} ${o} ${counts[o]}`)
  )
  return `Chất lượng đo trên ${comparable.keys.size}/${comparable.total} đoạn; loại ${dropped} đoạn: ${parts.join(', ')}.`
}

/**
 * Chương mà mọi đoạn đều `translated` ở cả hai lần chạy. Cho bộ đo cũ, vốn chỉ có số theo chương nên
 * không loại được từng đoạn: loại cả chương có đoạn không hoàn thành.
 */
export function fullyTranslatedChapters(
  a: Record<string, Record<string, ParagraphOutcome>>,
  b: Record<string, Record<string, ParagraphOutcome>>
): string[] {
  const complete = (map: Record<string, Record<string, ParagraphOutcome>>): Set<string> =>
    new Set(
      Object.entries(map)
        .filter(([, ids]) => Object.values(ids).every((outcome) => outcome === 'translated'))
        .map(([chapter]) => chapter)
    )
  const left = complete(a)
  const right = complete(b)
  return [...left].filter((chapter) => right.has(chapter)).sort()
}

/**
 * Chương bộ đo cũ được so: có kết cục ở cả hai lần chạy thì chỉ giữ chương mọi đoạn đều dịch được ở cả
 * hai; thiếu ở một bên thì giữ giao chương và trả câu cảnh báo cho đầu phần T0.
 */
export function benchChapters(
  common: string[],
  a: Record<string, Record<string, ParagraphOutcome>> | null,
  b: Record<string, Record<string, ParagraphOutcome>> | null
): { chapters: string[]; note: string } {
  if (!a || !b) {
    return {
      chapters: common,
      note: 'Chỉ lấy giao chương, chưa loại đoạn bị từ chối (một lần chạy không có outcomes.json).'
    }
  }
  const complete = new Set(fullyTranslatedChapters(a, b))
  const chapters = common.filter((chapter) => complete.has(chapter))
  return {
    chapters,
    note:
      `Loại ${common.length - chapters.length}/${common.length} chương có đoạn không dịch được ở một ` +
      'trong hai lần chạy (số T0 tính theo chương nên không loại được từng đoạn).'
  }
}

// ---------------------------------------------------------------- đo lặp

/** Nhãn các lần lặp của một biến thể: `label#1…#N`. */
export function repeatLabels(label: string, n: number): string[] {
  if (!Number.isInteger(n) || n < 2) throw new Error('--repeat cần số nguyên ≥ 2.')
  if (label.includes('#')) throw new Error(`Nhãn ${label} đã là một lần lặp.`)
  return Array.from({ length: n }, (_, i) => `${label}#${i + 1}`)
}

/** Biến thể gốc của một nhãn lặp (`a#2` → `a`); nhãn thường trả chính nó. */
export const repeatBase = (label: string): string => label.replace(/#\d+$/, '')

/**
 * Ước tính chi phí N lần lặp: USD/chương trung bình của các chương đã dịch trước đó × số chương × N.
 * `null` khi chưa có chương nào có giá (khi đó Lab bắt buộc `--max-usd`).
 */
export function estimateRepeatCost(
  previous: Array<{ usd?: number }>,
  chapters: number,
  n: number
): number | null {
  const priced = previous.filter((stat) => typeof stat.usd === 'number' && stat.usd > 0)
  if (priced.length === 0) return null
  const perChapter = priced.reduce((sum, stat) => sum + (stat.usd ?? 0), 0) / priced.length
  return perChapter * chapters * n
}

export interface Spread {
  n: number
  min: number
  max: number
  mean: number
  /** Độ lệch chuẩn mẫu (chia n − 1); 0 khi n = 1. */
  sd: number
}

export function spread(values: number[]): Spread | null {
  if (values.length === 0) return null
  const n = values.length
  const mean = values.reduce((sum, v) => sum + v, 0) / n
  const sd = n < 2 ? 0 : Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1))
  return { n, min: Math.min(...values), max: Math.max(...values), mean, sd }
}

export type Verdict = 'different' | 'indistinguishable' | 'too_few'

/**
 * Hai cấu hình chỉ “khác biệt” khi mỗi bên có ít nhất 2 lần lặp và khoảng [min, max] không chồng nhau.
 * Không có ngưỡng nhiễu cố định.
 */
export function decide(
  a: number[],
  b: number[],
  higherIsBetter: boolean
): { verdict: Verdict; better: 'a' | 'b' | null } {
  const sa = spread(a)
  const sb = spread(b)
  if (!sa || !sb || sa.n < 2 || sb.n < 2) return { verdict: 'too_few', better: null }
  if (sa.max < sb.min) return { verdict: 'different', better: higherIsBetter ? 'b' : 'a' }
  if (sb.max < sa.min) return { verdict: 'different', better: higherIsBetter ? 'a' : 'b' }
  return { verdict: 'indistinguishable', better: null }
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  different: 'khác biệt',
  indistinguishable: 'chưa phân biệt được',
  too_few: 'chưa đủ lần lặp'
}

/** Những gì phải giống nhau giữa các lần lặp để gộp được. */
export interface RepeatRun {
  variant: string
  runId: string
  model: string | null
  thinking: string | null
  promptVersion: string | null
  contextHash?: string
  chapters: number[]
}

const signature = (run: RepeatRun): string =>
  JSON.stringify([
    run.contextHash ?? null,
    run.model,
    run.thinking,
    run.promptVersion,
    [...run.chapters].sort((a, b) => a - b)
  ])

/**
 * Gom các lần chạy theo biến thể gốc. Trong mỗi nhóm, cấu hình chiếm đa số là chuẩn; lần nào lệch
 * (ngữ cảnh, model, thinking, prompt hay tập chương) bị từ chối gộp và nêu lý do.
 */
export function groupRepeats(runs: RepeatRun[]): {
  groups: Record<string, RepeatRun[]>
  rejected: Array<{ run: RepeatRun; reason: string }>
} {
  const byBase = new Map<string, RepeatRun[]>()
  for (const run of runs) {
    const base = repeatBase(run.variant)
    byBase.set(base, [...(byBase.get(base) ?? []), run])
  }
  const groups: Record<string, RepeatRun[]> = {}
  const rejected: Array<{ run: RepeatRun; reason: string }> = []
  for (const [base, members] of byBase) {
    const tally = new Map<string, number>()
    for (const run of members) tally.set(signature(run), (tally.get(signature(run)) ?? 0) + 1)
    const majority = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const reference = members.find((run) => signature(run) === majority)!
    groups[base] = []
    for (const run of members) {
      if (signature(run) === majority) {
        groups[base].push(run)
        continue
      }
      const reasons: string[] = []
      if ((run.contextHash ?? null) !== (reference.contextHash ?? null))
        reasons.push('ngữ cảnh khác hash')
      if (run.model !== reference.model) reasons.push(`model ${run.model} ≠ ${reference.model}`)
      if (run.thinking !== reference.thinking)
        reasons.push(`thinking ${run.thinking} ≠ ${reference.thinking}`)
      if (run.promptVersion !== reference.promptVersion) reasons.push('prompt khác')
      if (signature({ ...run, chapters: reference.chapters }) === majority)
        reasons.push('tập chương khác')
      rejected.push({ run, reason: reasons.join(', ') || 'cấu hình khác' })
    }
  }
  return { groups, rejected }
}

// ---------------------------------------------------------------- lớp phép kiểm

export type MetricTier = 'gate' | 'flag' | 'judge' | 'human'

/**
 * Lớp của từng chỉ số. `gate` chứng minh được bằng code và là thứ duy nhất được dùng để kết luận một
 * cấu hình hỏng; `flag` là heuristic có thể báo nhầm, trình bày là số cờ cần xem.
 */
export const METRIC_TIERS: Record<string, { tier: MetricTier; label: string }> = {
  mismatched: { tier: 'gate', label: 'Chương lệch số đoạn' },
  missingParagraphs: { tier: 'gate', label: 'Đoạn thiếu' },
  glossary: { tier: 'flag', label: 'Cờ glossary (khớp)' },
  names: { tier: 'flag', label: 'Cờ tên (nhất quán)' },
  addressing: { tier: 'flag', label: 'Cờ xưng hô lệch' },
  length: { tier: 'flag', label: 'Cờ độ dài bất thường' },
  cjk: { tier: 'flag', label: 'Cờ chữ CJK còn sót' },
  judge: { tier: 'judge', label: 'Judge T1 (tham khảo)' },
  human: { tier: 'human', label: 'Chấm mù T3' }
}

export const TIER_LABEL: Record<MetricTier, string> = {
  gate: 'gate',
  flag: 'cờ',
  judge: 'judge',
  human: 'người'
}

// ---------------------------------------------------------------- lần chạy hỏng

/**
 * Lần chạy hỏng: không có lần đo nào trỏ tới và mọi lời gọi lỗi HTTP, hoặc `request_error` chiếm từ một
 * nửa số đoạn trở lên. Trả lý do ngắn, hoặc `null` khi lần chạy dùng được.
 */
export function brokenRunReason(
  run: {
    calls: number
    httpErrors: number
    outcomes?: { counts: Partial<OutcomeCounts> }
    usd: number | null
  },
  measured: boolean
): string | null {
  const counts = run.outcomes?.counts
  const total = counts ? OUTCOMES.reduce((sum, o) => sum + (counts[o] ?? 0), 0) : 0
  if (counts && total > 0 && (counts.request_error ?? 0) / total >= 0.5) {
    return `request_error ${counts.request_error}/${total} đoạn (tham số hoặc cấu hình bị từ chối)`
  }
  if (!measured && run.calls > 0 && run.httpErrors === run.calls) {
    return `mọi lời gọi lỗi HTTP (${run.httpErrors}/${run.calls})`
  }
  if (!measured && run.calls === 0 && (run.usd ?? 0) === 0) return 'không có lời gọi nào'
  return null
}
