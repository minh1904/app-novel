/**
 * Sổ đăng ký lần chạy của Mira Lab: mỗi lần dịch và mỗi lần chấm là một bản ghi chỉ thêm, không ghi đè.
 *
 * Trước sổ này, `lab.json` chỉ giữ thống kê mới nhất của mỗi biến thể và chương, còn số chấm xưng hô
 * chỉ in ra console; muốn biết prompt nào cho số nào phải đọc lại văn xuôi. Hai loại bản ghi tách nhau
 * vì bản dịch của một biến thể bị lần chạy sau ghi đè: **lần chạy** nói đã gửi gì và tốn bao nhiêu,
 * **lần đo** chụp chất lượng của bản dịch tại thời điểm đo và trỏ về các lần chạy đã sinh ra nó.
 *
 * Hàm thuần: không đọc tệp, không gọi git; hàm băm được truyền vào để dùng được ở mọi tiến trình.
 *
 * Schema 2 (change `lab-completion-quality-report`): lần chạy trỏ tới tệp kết cục từng đoạn và mang
 * `contextHash`; lần đo mang `basis` (tập đoạn đã đo). Bản ghi schema 1 vẫn đọc được: thiếu kết cục
 * thì nhãn “không có kết cục từng đoạn”.
 */

import {
  METRIC_TIERS,
  OUTCOMES,
  VERDICT_LABEL,
  brokenRunReason,
  decide,
  spread,
  type MetricTier,
  type OutcomeCounts,
  type Verdict
} from './labOutcomes'

export const REGISTRY_SCHEMA = 2

/** Nhãn cho request trước khi prompt hợp nhất (thẻ tiếng Việt `<nguon>`): không biết chắc thế hệ nào. */
export const LEGACY_PROMPT = 'legacy'

export interface RegistryMessage {
  role: string
  content: string
}

/** Một dòng `runs/<runId>/<ncode>-<variant>.jsonl` của Lab; bản cũ ghi `version` thay cho `variant`. */
export interface RegistryCall {
  ncode: string
  variant?: string
  version?: string
  chapter: number
  messages: RegistryMessage[]
  status: number
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  reasoningTokens?: number
  ms: number
}

export interface RunRecord {
  kind: 'run'
  schema: number
  /** `<runId>/<ncode>/<variant>`: một lần chạy của một biến thể trên một truyện. */
  id: string
  runId: string
  at: string
  ncode: string
  variant: string
  thinking: string | null
  model: string | null
  promptVersion: string | null
  /** Băm của các system prompt khác nhau đã gửi; thường một, nhiều hơn là prompt đổi giữa chừng. */
  systemHashes: string[]
  commit: string | null
  /** Có thay đổi chưa commit lúc chạy: commit không đủ để dựng lại prompt. */
  dirty: boolean | null
  /** Commit đoán theo thời điểm, cho lần chạy nhập lại từ tệp cũ. */
  commitApprox?: boolean
  chapters: number[]
  /** Glossary, nhân vật và cặp xưng hô đã nạp: băm nội dung và ai tạo ra nó. */
  glossary?: GlossaryProvenance
  /**
   * Hash bản chụp ngữ cảnh mà lượt dịch từng chương đã dùng (số chương → hash). Hai lần chạy cùng hash
   * ở một chương là cùng ngữ cảnh; khác hash thì so sánh lẫn cả thay đổi ngữ cảnh.
   */
  contexts?: Record<string, string>
  /** Băm gộp của `contexts`, không phụ thuộc thứ tự chương: các lần lặp phải trùng giá trị này. */
  contextHash?: string
  /** Tệp kết cục từng đoạn (trong thư mục lần chạy) và số đoạn theo loại kết cục. */
  outcomes?: { file: string; counts: Partial<OutcomeCounts> }
  /** Ngân sách lời gọi của các lượt dịch chương; thiếu ở lần chạy trước khi có ngân sách. */
  budget?: RunBudget
  /** Chế độ đầu ra và lỗi cấu trúc; thiếu ở lần chạy trước khi có chế độ schema (nghĩa là \`text\`). */
  output?: RunOutput
  calls: number
  httpErrors: number
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  reasoningTokens: number
  usd: number | null
  seconds: number
  note?: string
  backfilled?: boolean
}

/**
 * Nguồn gốc dữ liệu ngữ cảnh. Số đo chỉ nói về sản phẩm khi dữ liệu do chính luồng AI của Mira tạo
 * (`ai`) hoặc người dịch duyệt (`human`); dữ liệu soạn tay ngoài sản phẩm (`claude-draft`) làm số đẹp
 * hơn thực tế vì bỏ qua bước trích xuất.
 */
/** `none`: bản dịch chạy không có glossary, nhân vật hay cặp xưng hô nào. */
export type GlossaryOrigin = 'ai' | 'human' | 'claude-draft' | 'none' | 'unknown'

export interface GlossaryProvenance {
  hash: string
  origin: GlossaryOrigin
}

/** Đọc nguồn gốc từ tệp glossary: trường `origin` nếu có, không thì đoán từ ghi chú cũ. */
export function glossaryOriginOf(file: { origin?: string; note?: string } | null): GlossaryOrigin {
  if (!file) return 'unknown'
  if (file.origin === 'ai' || file.origin === 'human' || file.origin === 'claude-draft') {
    return file.origin
  }
  if (/^Nháp do Claude/.test(file.note ?? '')) return 'claude-draft'
  return 'unknown'
}

export interface StructureMetric {
  chapters: number
  mismatched: number
  missingParagraphs: number
}

export interface GlossaryMetric {
  hits: number
  checks: number
  /** Tệp glossary dùng làm đáp án; các biến thể chỉ so được khi cùng tệp. */
  reference?: string
}

/** Tên nhất quán (xem nameConsistency.ts): đoạn có tên nhân vật dùng đúng cách viết chính. */
export interface NamesMetric {
  names: number
  paragraphs: number
  consistent: number
  /** Tệp glossary cho danh sách nhân vật. */
  reference?: string
}

export interface AddressingMetric {
  /** Biến thể cho nhãn người nói → người nghe. */
  labels: string
  checked: number
  off: number
}

export interface MeasurementRecord {
  kind: 'measurement'
  schema: number
  id: string
  measuredAt: string
  commit: string | null
  dirty: boolean | null
  ncode: string
  variant: string
  chapters: number[]
  /** Lần chạy đã dịch các chương được đo, theo `lab.json` lúc đo. */
  runIds: string[]
  structure?: StructureMetric
  glossary?: GlossaryMetric
  names?: NamesMetric
  addressing?: AddressingMetric
  /**
   * Tập đoạn số chất lượng được đo trên: các biến thể đem so, số đoạn so được trên tổng, và số đoạn bị
   * loại theo biến thể và kết cục. Vắng là lần đo theo chương (schema 1).
   */
  basis?: MeasurementBasis
}

export interface MeasurementBasis {
  variants: string[]
  paragraphs: number
  total: number
  excluded: Record<string, Partial<OutcomeCounts>>
}

export interface RunMeta {
  runId: string
  ncode: string
  variant: string
  thinking: string | null
  model: string | null
  commit: string | null
  dirty: boolean | null
  commitApprox?: boolean
  promptVersion?: string | null
  glossary?: GlossaryProvenance
  contexts?: Record<string, string>
  outcomes?: { file: string; counts: Partial<OutcomeCounts> }
  budget?: RunBudget
  output?: RunOutput
  usd: number | null
  note?: string
  backfilled?: boolean
}

/**
 * Ngân sách lời gọi của các lượt dịch chương trong lần chạy (change `translation-call-budget`):
 * `modelCalls` là lời gọi model đã trừ vào ngân sách, `budgetExhausted` là số đoạn không được gửi vì hết
 * ngân sách, `maxCalls` là quỹ phụ mỗi chương đặt bằng `--max-calls` (`null`: mặc định). Số request HTTP
 * thật là `calls` của bản ghi.
 */
export interface RunBudget {
  modelCalls: number
  budgetExhausted: number
  maxCalls: number | null
}

/**
 * Chế độ đầu ra của lần chạy (change `translate-structured-output-trial`): `requested` là chế độ Lab xin
 * (`object` khi chạy với `--schema`), `fallbacks` là số lô có schema bị từ chối và gửi lại không schema.
 * Lỗi cấu trúc của câu trả lời lượt chính, cộng qua các lô: mục lạ, mục lặp, đoạn phải hỏi lại. Lần chạy
 * trước khi có trường này là `text` (mảng, không schema).
 */
export interface RunOutput {
  requested: 'array' | 'object'
  batches: number
  fallbacks: number
  extraneous: number
  duplicate: number
  repaired: number
}

/** Nhãn chế độ đầu ra của một lần chạy cho bảng: `text`, `schema`, hoặc `schema (N lô rơi về)`. */
export function outputLabel(run: Pick<RunRecord, 'output'>): string {
  if (!run.output || run.output.requested === 'array') return 'text'
  return run.output.fallbacks > 0 ? `schema (${run.output.fallbacks} lô rơi về)` : 'schema'
}

/** Mục lạ / mục lặp / đoạn phải hỏi lại, cộng qua các lần chạy; `–` khi không lần nào ghi. */
export function structureLabel(runs: Array<Pick<RunRecord, 'output'>>): string {
  const recorded = runs.filter((run) => run.output)
  if (recorded.length === 0) return '–'
  const sum = (pick: (output: RunOutput) => number): number =>
    recorded.reduce((total, run) => total + pick(run.output!), 0)
  return `${sum((o) => o.extraneous)}/${sum((o) => o.duplicate)}/${sum((o) => o.repaired)}`
}

/** Băm gộp các hash bản chụp theo chương, sắp theo chương để thứ tự ghi không đổi kết quả. */
export function combinedContextHash(
  contexts: Record<string, string> | undefined,
  hash: (text: string) => string
): string | undefined {
  if (!contexts || Object.keys(contexts).length === 0) return undefined
  const entries = Object.entries(contexts).sort(([a], [b]) => Number(a) - Number(b))
  return hash(JSON.stringify(entries))
}

/** `2026-10-06T03-36-05-395Z` (tên thư mục) → `2026-10-06T03:36:05.395Z`. */
export function runIdToIso(runId: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/.exec(runId)
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z` : runId
}

/** Thế hệ prompt đọc từ request: thẻ `<source>` là prompt hợp nhất, `<nguon>` là trước đó. */
export function promptVersionOf(messages: RegistryMessage[], current: string): string | null {
  const user = messages.find((message) => message.role === 'user')?.content ?? ''
  if (/<source>/.test(user)) return current
  if (/<nguon>/.test(user)) return LEGACY_PROMPT
  return null
}

/** Gộp các lời gọi của một biến thể trong một lần chạy thành một bản ghi. */
export function summarizeRun(
  calls: RegistryCall[],
  meta: RunMeta,
  hash: (text: string) => string,
  currentPrompt: string
): RunRecord {
  const hashes = new Set<string>()
  const versions = new Set<string>()
  for (const call of calls) {
    const system = call.messages.find((message) => message.role === 'system')?.content
    if (system !== undefined) hashes.add(hash(system))
    const version = promptVersionOf(call.messages, currentPrompt)
    if (version) versions.add(version)
  }
  const sum = (pick: (call: RegistryCall) => number): number =>
    calls.reduce((total, call) => total + pick(call), 0)
  return {
    kind: 'run',
    schema: REGISTRY_SCHEMA,
    id: `${meta.runId}/${meta.ncode}/${meta.variant}`,
    runId: meta.runId,
    at: runIdToIso(meta.runId),
    ncode: meta.ncode,
    variant: meta.variant,
    thinking: meta.thinking,
    model: meta.model,
    // Lần chạy nhập lại đều có trước khi hợp nhất prompt; request v1 không mang thẻ nào để nhận ra.
    promptVersion:
      meta.promptVersion ??
      (versions.size === 1 ? [...versions][0] : meta.backfilled ? LEGACY_PROMPT : null),
    systemHashes: [...hashes].sort(),
    commit: meta.commit,
    dirty: meta.dirty,
    ...(meta.commitApprox ? { commitApprox: true } : {}),
    chapters: [...new Set(calls.map((call) => call.chapter))].sort((a, b) => a - b),
    ...(meta.glossary ? { glossary: meta.glossary } : {}),
    ...(meta.contexts && Object.keys(meta.contexts).length > 0
      ? { contexts: meta.contexts, contextHash: combinedContextHash(meta.contexts, hash) }
      : {}),
    ...(meta.outcomes ? { outcomes: meta.outcomes } : {}),
    ...(meta.budget ? { budget: meta.budget } : {}),
    ...(meta.output ? { output: meta.output } : {}),
    calls: calls.length,
    httpErrors: calls.filter((call) => call.status !== 200).length,
    inputTokens: sum((call) => call.inputTokens),
    cachedTokens: sum((call) => call.cachedTokens),
    outputTokens: sum((call) => call.outputTokens),
    reasoningTokens: sum((call) => call.reasoningTokens ?? 0),
    usd: meta.usd,
    seconds: Math.round(sum((call) => call.ms) / 100) / 10,
    ...(meta.note ? { note: meta.note } : {}),
    ...(meta.backfilled ? { backfilled: true } : {})
  }
}

/**
 * Chương mà hai lần chạy đều có hash bản chụp nhưng khác nhau: ở đó hai bản dịch không dùng cùng ngữ
 * cảnh. `unknown` là chương chỉ một bên có hash (lần chạy cũ chưa ghi), nên không nói được.
 */
export function contextDifferences(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined
): { differ: number[]; unknown: number[] } {
  const chapters = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])]
    .map(Number)
    .sort((x, y) => x - y)
  const differ: number[] = []
  const unknown: number[] = []
  for (const chapter of chapters) {
    const left = a?.[String(chapter)]
    const right = b?.[String(chapter)]
    if (left === undefined || right === undefined) unknown.push(chapter)
    else if (left !== right) differ.push(chapter)
  }
  return { differ, unknown }
}

/** Đọc tệp JSONL của sổ; dòng hỏng bị bỏ qua thay vì làm hỏng cả sổ. */
export function parseRegistry<T>(text: string): T[] {
  const out: T[] = []
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    try {
      out.push(JSON.parse(line) as T)
    } catch {
      // dòng ghi dở khi tiến trình bị ngắt
    }
  }
  return out
}

const rate = (hits: number, total: number): number | null => (total === 0 ? null : hits / total)

/** Trạng thái mới nhất của một biến thể: mỗi loại chỉ số lấy từ lần đo gần nhất có loại đó. */
export interface VariantSnapshot {
  ncode: string
  variant: string
  structure?: { value: StructureMetric; at: string; chapters: number[] }
  glossary?: { value: GlossaryMetric; at: string; chapters: number[] }
  names?: { value: NamesMetric; at: string; chapters: number[] }
  addressing?: { value: AddressingMetric; at: string; chapters: number[] }
  runs: RunRecord[]
}

export function snapshotOf(
  ncode: string,
  variant: string,
  runs: RunRecord[],
  measurements: MeasurementRecord[]
): VariantSnapshot {
  const mine = measurements
    .filter((m) => m.ncode === ncode && m.variant === variant)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  const snapshot: VariantSnapshot = { ncode, variant, runs: [] }
  const runIds = new Set<string>()
  for (const m of mine) {
    if (m.structure)
      snapshot.structure = { value: m.structure, at: m.measuredAt, chapters: m.chapters }
    if (m.glossary)
      snapshot.glossary = { value: m.glossary, at: m.measuredAt, chapters: m.chapters }
    if (m.names) snapshot.names = { value: m.names, at: m.measuredAt, chapters: m.chapters }
    if (m.addressing) {
      snapshot.addressing = { value: m.addressing, at: m.measuredAt, chapters: m.chapters }
    }
  }
  for (const m of mine.slice(-3)) m.runIds.forEach((id) => runIds.add(id))
  snapshot.runs = runs
    .filter((run) => run.ncode === ncode && run.variant === variant && runIds.has(run.runId))
    .sort((a, b) => a.at.localeCompare(b.at))
  return snapshot
}

const short = (hash: string): string => hash.slice(0, 8)
const join = (values: Iterable<string | null>): string =>
  [...new Set([...values].filter((v): v is string => Boolean(v)))].join(', ') || '–'
const percent = (value: number | null): string =>
  value === null ? '–' : `${Math.round(value * 1000) / 10}%`
const chapterSpan = (chapters: number[]): string => {
  if (chapters.length === 0) return '–'
  const sorted = [...chapters].sort((a, b) => a - b)
  const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1)
  return contiguous && sorted.length > 1
    ? `${sorted[0]}–${sorted[sorted.length - 1]}`
    : sorted.join(',')
}

/** Prompt `v1` nối glossary vào system nên mỗi lô một hash; quá ba thì chỉ đếm. */
function hashSummary(hashes: string[]): string {
  const unique = [...new Set(hashes)].sort()
  if (unique.length > 3) return `${unique.length} hash (system đổi theo lô)`
  return unique.map(short).join(', ') || '–'
}

/** Cấu hình gộp của các lần chạy sau một ảnh chụp, để thấy hai biến thể khác nhau ở đâu. */
export function configOf(runs: RunRecord[]): {
  model: string
  thinking: string
  prompt: string
  systemHash: string
  commit: string
  glossary: string
  output: string
  structure: string
  usd: number | null
} {
  const usd = runs.some((run) => run.usd !== null)
    ? runs.reduce((total, run) => total + (run.usd ?? 0), 0)
    : null
  return {
    model: join(runs.map((run) => run.model)),
    thinking: join(runs.map((run) => run.thinking ?? 'mặc định')),
    prompt: join(runs.map((run) => run.promptVersion)),
    systemHash: hashSummary(runs.flatMap((run) => run.systemHashes)),
    commit: join(
      runs.map((run) =>
        run.commit ? `${run.commit}${run.dirty ? '+' : ''}${run.commitApprox ? '~' : ''}` : null
      )
    ),
    glossary: join(runs.map((run) => (run.glossary ? run.glossary.origin : null))),
    output: join(runs.map((run) => outputLabel(run))),
    structure: structureLabel(runs),
    usd
  }
}

export interface Comparison {
  rows: Array<{
    metric: string
    a: string
    b: string
    better: 'a' | 'b' | null
    /** Lớp phép kiểm; vắng với dòng cấu hình. */
    tier?: MetricTier
    /** Kết luận theo khoảng dao động; vắng với dòng cấu hình. */
    verdict?: Verdict
  }>
  warnings: string[]
}

type MetricKey = 'mismatched' | 'missingParagraphs' | 'glossary' | 'names' | 'addressing'

/** Giá trị một chỉ số của một ảnh chụp, và chiều tốt hơn. */
const METRICS: Array<{
  key: MetricKey
  higherIsBetter: boolean
  ratio: boolean
  value: (s: VariantSnapshot) => number | null
}> = [
  { key: 'mismatched', higherIsBetter: false, ratio: false, value: (s) => s.structure?.value.mismatched ?? null },
  {
    key: 'missingParagraphs',
    higherIsBetter: false,
    ratio: false,
    value: (s) => s.structure?.value.missingParagraphs ?? null
  },
  {
    key: 'glossary',
    higherIsBetter: true,
    ratio: true,
    value: (s) => (s.glossary ? rate(s.glossary.value.hits, s.glossary.value.checks) : null)
  },
  {
    key: 'names',
    higherIsBetter: true,
    ratio: true,
    value: (s) => (s.names ? rate(s.names.value.consistent, s.names.value.paragraphs) : null)
  },
  {
    key: 'addressing',
    higherIsBetter: false,
    ratio: true,
    value: (s) => (s.addressing ? rate(s.addressing.value.off, s.addressing.value.checked) : null)
  }
]

/** Một giá trị, hoặc với nhiều lần lặp: `n=3 · 92–95% · tb 93.5% ± 1.2`. */
function describeValues(values: number[], show: (v: number) => string, ratio: boolean): string {
  const s = spread(values)
  if (!s) return '–'
  if (s.n === 1) return show(s.min)
  const sd = ratio ? `${Math.round(s.sd * 1000) / 10}` : `${Math.round(s.sd * 10) / 10}`
  return `n=${s.n} · ${show(s.min)}–${show(s.max)} · tb ${show(s.mean)} ± ${sd}`
}

/**
 * So hai nhóm lần lặp (mỗi nhóm là các ảnh chụp của cùng một cấu hình). Một chỉ số chỉ được đánh dấu
 * tốt hơn khi cả hai nhóm có ít nhất 2 lần lặp và khoảng [min, max] không chồng nhau; ngược lại ghi
 * “chưa đủ lần lặp” hoặc “chưa phân biệt được”, kèm số thô.
 */
export function compareGroups(aGroup: VariantSnapshot[], bGroup: VariantSnapshot[]): Comparison {
  const warnings: string[] = []
  const rows: Comparison['rows'] = []
  const a = aGroup[0]
  const b = bGroup[0]
  const sameChapters = (x?: number[], y?: number[]): boolean =>
    x !== undefined && y !== undefined && chapterSpan(x) === chapterSpan(y)

  if (a.structure && b.structure && !sameChapters(a.structure.chapters, b.structure.chapters)) {
    warnings.push(
      `Cấu trúc và glossary đo trên chương khác nhau: ${chapterSpan(a.structure.chapters)} so với ${chapterSpan(b.structure.chapters)}.`
    )
  }
  if (a.glossary && b.glossary && a.glossary.value.reference !== b.glossary.value.reference) {
    warnings.push(
      `Glossary đo trên hai tệp tham chiếu khác nhau: ${a.glossary.value.reference ?? '?'} so với ${b.glossary.value.reference ?? '?'}.`
    )
  }
  if (a.addressing && b.addressing) {
    if (!sameChapters(a.addressing.chapters, b.addressing.chapters)) {
      warnings.push(
        `Xưng hô đo trên chương khác nhau: ${chapterSpan(a.addressing.chapters)} so với ${chapterSpan(b.addressing.chapters)}.`
      )
    }
    if (a.addressing.value.labels !== b.addressing.value.labels) {
      warnings.push('Xưng hô chấm bằng nhãn người nói của hai biến thể khác nhau.')
    }
  }

  const count = (v: number): string => String(Math.round(v * 10) / 10)
  for (const metric of METRICS) {
    const av = aGroup.map(metric.value).filter((v): v is number => v !== null)
    const bv = bGroup.map(metric.value).filter((v): v is number => v !== null)
    const show = metric.ratio ? (v: number): string => percent(v) : count
    const { verdict, better } = decide(av, bv, metric.higherIsBetter)
    const tier = METRIC_TIERS[metric.key].tier
    rows.push({
      metric: `${METRIC_TIERS[metric.key].label} [${tier}] — ${VERDICT_LABEL[verdict]}`,
      a: describeValues(av, show, metric.ratio),
      b: describeValues(bv, show, metric.ratio),
      better,
      tier,
      verdict
    })
  }

  const usdOf = (group: VariantSnapshot[]): number[] =>
    group.map((s) => configOf(s.runs).usd).filter((v): v is number => v !== null)
  const usd = decide(usdOf(aGroup), usdOf(bGroup), false)
  rows.push({
    metric: `Chi phí (USD) — ${VERDICT_LABEL[usd.verdict]}`,
    a: describeValues(usdOf(aGroup), (v) => `$${v.toFixed(3)}`, false),
    b: describeValues(usdOf(bGroup), (v) => `$${v.toFixed(3)}`, false),
    better: usd.better,
    verdict: usd.verdict
  })

  const ca = configOf(aGroup.flatMap((s) => s.runs))
  const cb = configOf(bGroup.flatMap((s) => s.runs))
  for (const [metric, x, y] of [
    ['Model', ca.model, cb.model],
    ['Thinking', ca.thinking, cb.thinking],
    ['Prompt', ca.prompt, cb.prompt],
    ['System hash', ca.systemHash, cb.systemHash],
    ['Commit', ca.commit, cb.commit],
    ['Nguồn glossary', ca.glossary, cb.glossary]
  ] as const) {
    rows.push({ metric, a: x, b: y, better: null })
  }
  if (aGroup.some((s) => s.runs.length === 0) || bGroup.some((s) => s.runs.length === 0)) {
    warnings.push('Một bên chưa có lần chạy trong sổ (chạy `backfill` cho lần chạy cũ).')
  }
  return { rows, warnings }
}

/** So hai biến thể, mỗi bên một lần chạy: mọi chỉ số là “chưa đủ lần lặp”. */
export function compareSnapshots(a: VariantSnapshot, b: VariantSnapshot): Comparison {
  return compareGroups([a], [b])
}

/** Trang lịch sử sinh tự động: trạng thái hiện tại của từng biến thể và mọi lần đo theo thời gian. */
export function historyMarkdown(
  runs: RunRecord[],
  measurements: MeasurementRecord[],
  titles: Record<string, string>,
  generatedAt: string
): string {
  const lines: string[] = [
    '# Lịch sử đo của Mira Lab',
    '',
    `> Tệp sinh tự động bởi \`node scripts/lab/mira-lab.mjs history\` lúc ${generatedAt}; đừng sửa tay.`,
    '> Nguồn: `fixtures/private/lab/registry/`. Cách đọc ở [chạy thí nghiệm](running-experiments.md#sổ-đăng-ký-lần-chạy).',
    '',
    'Commit có `+` là lúc chạy còn thay đổi chưa commit; `~` là commit đoán theo thời điểm cho lần chạy',
    'nhập lại. Prompt `legacy` là thế hệ trước khi hợp nhất (v1–v4), không phân biệt được từ request.',
    'Xưng hô lệch chỉ so được giữa các dòng chấm cùng nhãn người nói và cùng chương.',
    'Nguồn glossary `claude-draft` là dữ liệu soạn tay ngoài sản phẩm: số đo đó không nói về luồng thật',
    'của Mira, vì bỏ qua bước AI trích xuất glossary và xưng hô.'
  ]
  const codes = [...new Set([...runs, ...measurements].map((record) => record.ncode))].sort()
  for (const ncode of codes) {
    lines.push('', `## ${titles[ncode] ? `${titles[ncode]} (${ncode})` : ncode}`, '')
    const measuredRuns = new Set(
      measurements.filter((m) => m.ncode === ncode).flatMap((m) => m.runIds.map((id) => `${m.variant}\u0000${id}`))
    )
    const broken = runs
      .filter((run) => run.ncode === ncode)
      .map((run) => ({
        run,
        reason: brokenRunReason(run, measuredRuns.has(`${run.variant}\u0000${run.runId}`))
      }))
      .filter((item): item is { run: RunRecord; reason: string } => item.reason !== null)
    const brokenIds = new Set(broken.map((item) => item.run.id))
    const usable = runs.filter((run) => !brokenIds.has(run.id))
    // Biến thể chỉ có lần chạy hỏng và chưa có lần đo nào không nằm trong bảng so sánh chính.
    const variants = [
      ...new Set(
        [...usable, ...measurements]
          .filter((record) => record.ncode === ncode)
          .map((record) => record.variant)
      )
    ].sort()
    lines.push(
      '| Biến thể | Model | Thinking | Prompt | Đầu ra | System | Commit | Nguồn glossary | Chương | Lệch đoạn | Đoạn thiếu | Lạ/lặp/hỏi lại | Glossary | Tên nhất quán | Xưng hô lệch | USD |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    )
    for (const variant of variants) {
      const snap = snapshotOf(ncode, variant, usable, measurements)
      const runsForConfig =
        snap.runs.length > 0
          ? snap.runs
          : usable.filter((run) => run.ncode === ncode && run.variant === variant)
      const config = configOf(runsForConfig)
      const s = snap.structure?.value
      const g = snap.glossary?.value
      const n = snap.names?.value
      const x = snap.addressing?.value
      lines.push(
        `| ${variant} | ${config.model} | ${config.thinking} | ${config.prompt} | ${config.output} | ${config.systemHash} | ` +
          `${config.commit} | ${config.glossary} | ${chapterSpan(snap.structure?.chapters ?? snap.addressing?.chapters ?? [])} | ` +
          `${s ? s.mismatched : '–'} | ${s ? s.missingParagraphs : '–'} | ${config.structure} | ` +
          `${g ? `${percent(rate(g.hits, g.checks))} (${g.hits}/${g.checks})` : '–'} | ` +
          `${n ? `${percent(rate(n.consistent, n.paragraphs))} (${n.names} tên)` : '–'} | ` +
          `${x ? `${percent(rate(x.off, x.checked))} (${x.off}/${x.checked}, nhãn ${x.labels})` : '–'} | ` +
          `${config.usd === null ? '–' : `$${config.usd.toFixed(3)}`} |`
      )
    }

    const timeline = measurements
      .filter((m) => m.ncode === ncode)
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    if (timeline.length > 0) {
      lines.push(
        '',
        'Mọi lần đo, mới nhất trước:',
        '',
        '| Lúc đo | Biến thể | Chương | Cơ sở | Chỉ số | Commit | Lần chạy |',
        '| --- | --- | --- | --- | --- | --- | --- |'
      )
      for (const m of timeline) {
        const parts: string[] = []
        if (m.structure) {
          parts.push(`lệch ${m.structure.mismatched}, thiếu ${m.structure.missingParagraphs} đoạn`)
        }
        if (m.glossary) {
          parts.push(`glossary ${percent(rate(m.glossary.hits, m.glossary.checks))}`)
        }
        if (m.names) {
          parts.push(`tên nhất quán ${percent(rate(m.names.consistent, m.names.paragraphs))}`)
        }
        if (m.addressing) {
          parts.push(
            `xưng hô lệch ${m.addressing.off}/${m.addressing.checked} (nhãn ${m.addressing.labels})`
          )
        }
        lines.push(
          `| ${m.measuredAt.slice(0, 16).replace('T', ' ')} | ${m.variant} | ${chapterSpan(m.chapters)} | ` +
            `${m.basis ? `${m.basis.paragraphs}/${m.basis.total} đoạn so được` : 'theo chương'} | ` +
            `${parts.join('; ')} | ${m.commit ?? '–'}${m.dirty ? '+' : ''} | ${m.runIds.length} |`
        )
      }
    }

    if (broken.length > 0) {
      lines.push(
        '',
        'Lần chạy hỏng (không vào bảng so sánh chính):',
        '',
        '| Lúc chạy | Biến thể | Model | Thinking | Lý do | USD |',
        '| --- | --- | --- | --- | --- | --- |'
      )
      for (const { run, reason } of broken.sort((a, b) => b.run.at.localeCompare(a.run.at))) {
        lines.push(
          `| ${run.at.slice(0, 16).replace('T', ' ')} | ${run.variant} | ${run.model ?? '–'} | ` +
            `${run.thinking ?? 'mặc định'} | ${reason} | ${run.usd === null ? '–' : `$${run.usd.toFixed(3)}`} |`
        )
      }
    }

    const noOutcomes = usable.filter((run) => run.ncode === ncode && !run.outcomes)
    if (noOutcomes.length > 0 && usable.some((run) => run.ncode === ncode && run.outcomes)) {
      lines.push(
        '',
        `${noOutcomes.length} lần chạy không có kết cục từng đoạn (ghi trước schema 2): không tính được ` +
          'tỷ lệ hoàn thành của chúng.'
      )
    }
  }
  return lines.join('\n') + '\n'
}

/**
 * Dòng phần Hoàn thành của một biến thể: số và tỷ lệ từng loại kết cục trên toàn tập, không loại đoạn
 * nào. Không có kết cục thì nói rõ, không coi là hoàn thành 100%.
 */
/** `counts` từ sổ có thể thiếu loại kết cục thêm sau ngày ghi; thiếu là 0. */
export function completionCells(counts: Partial<OutcomeCounts> | null): string[] {
  if (!counts) return ['không có kết cục từng đoạn', ...OUTCOMES.slice(1).map(() => '–')]
  // Bản ghi cũ không có các loại kết cục thêm sau (`budget_exhausted`): thiếu là 0.
  const total = OUTCOMES.reduce((sum, o) => sum + (counts[o] ?? 0), 0)
  return OUTCOMES.map((o) =>
    o === 'translated'
      ? `${counts.translated ?? 0}/${total} (${percent(rate(counts.translated ?? 0, total))})`
      : String(counts[o] ?? 0)
  )
}
