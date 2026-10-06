/**
 * Mira Lab — CLI thử hệ thống prompt trên truyện thật, ngoài giao diện.
 *
 * Mỗi truyện nạp thành nhiều **bản** (biến thể) trong một thư viện Mira riêng
 * (`fixtures/private/lab/data`), cùng bản gốc và cùng glossary. Một biến thể là phiên bản prompt
 * cộng mức thinking: `a`, `a-nothink`, `a-think`… Dịch đi qua đúng đường của UI
 * (`ParagraphTranslator`, chính sách tự áp dụng), nên mở thư viện này bằng app (`MIRA_DATA_DIR`) là
 * đọc được kết quả ngay trong editor.
 *
 * Chạy: `node scripts/lab/mira-lab.mjs <lệnh>`; `help` liệt kê lệnh.
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join, resolve } from 'node:path'
import { LibraryStore } from '../../src/main/services/library/library'
import { createServices, type Services } from '../../src/main/services/createServices'
import { GlossaryService } from '../../src/main/services/context/glossaryService'
import { AddressingService } from '../../src/main/services/context/addressingService'
import type { CharacterGender } from '../../src/shared/contracts/addressing'
import { addressingGaps, isPronounLike } from '../../src/shared/algorithms/addressingGaps'
import {
  buildAnalysisMessages,
  collectAddressingEvidence,
  parseAnalysis
} from '../../src/main/services/ai/addressingAnalysis'
import { suggestRegister } from '../../src/main/services/ai/translate/languageProfiles'
import type { TranslationModelCaller } from '../../src/shared/contracts/translateCore'
import type { SecretCrypto } from '../../src/main/infra/storage/secretStore'
import { paragraphUnits } from '../../src/main/services/ai/paragraphTranslation'
import { sanitizeJsonString } from '../../src/shared/algorithms/lenientParser'
import { costOfUsage } from '../../src/main/services/ai/costEstimate'
import { lookupModel } from '../../src/main/infra/providers/modelCatalog'
import { formatAsNovelHtml } from '../../src/main/services/export/formatters/pdfFormatter'
import { segment } from '../../src/shared/algorithms/segmenter'
import { DESCRIPTION_MAX } from '../../src/shared/contracts/library'
import { THINKING_LEVELS, type ThinkingLevel } from '../../src/shared/contracts/modelSettings'
import type { ContextEntryItem } from '../../src/shared/contracts/glossary'

const ROOT = process.cwd()
const LAB = join(ROOT, 'fixtures', 'private', 'lab')
const MANIFEST = join(LAB, 'lab.json')
const DEFAULT_VARIANTS = ['base']
/** Mức thinking mà hậu tố `-think` chọn. */
const THINK_LEVEL: ThinkingLevel = 'medium'

// ---------------------------------------------------------------- tham số và cấu hình

interface Args {
  command: string
  positional: string[]
  flags: Map<string, string>
}

function parseArgs(argv: string[]): Args {
  const [command = 'help', ...rest] = argv
  const positional: string[] = []
  const flags = new Map<string, string>()
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const [name, inline] = arg.slice(2).split('=', 2)
    const next = rest[i + 1]
    if (inline !== undefined) flags.set(name, inline)
    else if (next !== undefined && !next.startsWith('--')) flags.set(name, rest[++i])
    else flags.set(name, 'true')
  }
  return { command, positional, flags }
}

function loadEnvFile(): Record<string, string> {
  const path = join(ROOT, '.env')
  const out: Record<string, string> = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (line.trimStart().startsWith('#')) continue
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

const fileEnv = loadEnvFile()
const env = (name: string, fallback = ''): string => process.env[name] || fileEnv[name] || fallback

/** `1-3,5` → [1, 2, 3, 5]. Bỏ trống là mọi chương. */
function parseRange(spec: string | undefined, max: number): number[] {
  if (!spec || spec === 'true' || spec === 'all')
    return Array.from({ length: max }, (_, i) => i + 1)
  const out = new Set<number>()
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-').map((value) => Number(value.trim()))
    if (!Number.isInteger(a)) throw new Error('Phạm vi chương không hợp lệ: ' + spec)
    for (let n = a; n <= (Number.isInteger(b) ? b : a); n++) if (n >= 1 && n <= max) out.add(n)
  }
  return [...out].sort((x, y) => x - y)
}

// ---------------------------------------------------------------- biến thể

interface Variant {
  label: string
  /** Vắng là để mặc định của model. */
  thinking?: ThinkingLevel
}

/**
 * Nhãn là tên tự đặt (prompt chỉ còn một thế hệ): `a` → thinking mặc định. `a-nothink` → thinking
 * `off`. `a-think` → `medium`. Có thể ghi thẳng mức: `a-low`, `b-high`.
 */
function parseVariant(label: string): Variant {
  // Phần sau "+" chỉ là nhãn để giữ nhiều lần thử cạnh nhau (ví dụ "a-nothink+ctx"), không đổi cấu hình.
  const suffix = label.split('+')[0].split('-', 2)[1]
  if (suffix === undefined) return { label }
  if (suffix === 'nothink') return { label, thinking: 'off' }
  if (suffix === 'think') return { label, thinking: THINK_LEVEL }
  if ((THINKING_LEVELS as readonly string[]).includes(suffix)) {
    return { label, thinking: suffix as ThinkingLevel }
  }
  throw new Error('Mức thinking không hợp lệ trong ' + label)
}

function describeVariant(variant: Variant): string {
  const thinking =
    variant.thinking === undefined
      ? 'thinking mặc định'
      : variant.thinking === 'off'
        ? 'không thinking'
        : `thinking ${variant.thinking}`
  return thinking
}

/** Biến thể của truyện mà lệnh nhắm tới: `--variants` lọc, không có thì mọi bản đã nạp. */
function variantsOf(novel: NovelEntry, flags: Map<string, string>): Variant[] {
  const raw = flags.get('variants') ?? flags.get('versions') ?? flags.get('version')
  const labels = raw ? raw.split(',').map((value) => value.trim()) : Object.keys(novel.copies)
  return labels.filter((label) => novel.copies[label] !== undefined).map(parseVariant)
}

// ---------------------------------------------------------------- manifest

interface ChapterStats {
  at: string
  model: string
  calls: number
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  /** Token thinking; Gemini để ngoài `completion_tokens`, tính bằng `total − prompt − completion`. */
  reasoningTokens?: number
  usd?: number
  failed: number
  seconds: number
}

interface NovelEntry {
  ncode: string
  title: string
  dir: string
  chapterCount: number
  /** Nhãn biến thể → id tác phẩm. */
  copies: Record<string, string>
  /** Tên tiếng Việt người dùng đặt cho từng bản, dùng làm tên tác phẩm và tên tệp xuất. */
  names?: Record<string, string>
  stats: Record<string, Record<string, ChapterStats>>
}

interface Manifest {
  dataDir: string
  novels: Record<string, NovelEntry>
}

function readManifest(): Manifest {
  if (!existsSync(MANIFEST)) return { dataDir: join(LAB, 'data'), novels: {} }
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest
}

function writeManifest(manifest: Manifest): void {
  mkdirSync(LAB, { recursive: true })
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
}

function pickNovels(manifest: Manifest, codes: string[]): NovelEntry[] {
  const all = Object.values(manifest.novels)
  if (codes.length === 0 || codes.includes('all')) return all
  return codes.map((code) => {
    const novel = manifest.novels[code]
    if (!novel) throw new Error(`Chưa nạp truyện ${code}. Chạy "import" trước.`)
    return novel
  })
}

// ---------------------------------------------------------------- thư viện

/**
 * Khóa API chỉ nằm trong DB của lab dưới dạng đã XOR với một khóa ngẫu nhiên **của tiến trình này**:
 * tiến trình kết thúc là bản ghi không giải được nữa, kể cả khi lần chạy bị ngắt trước bước xóa kết nối.
 */
const processKey = randomBytes(64)
const volatileCrypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  async encrypt(value) {
    const bytes = Buffer.from(value, 'utf8')
    return Buffer.from(bytes.map((byte, i) => byte ^ processKey[i % processKey.length]))
  },
  async decrypt(value) {
    const bytes = Buffer.from(value)
    const plain = Buffer.from(bytes.map((byte, i) => byte ^ processKey[i % processKey.length]))
    return { value: plain.toString('utf8'), shouldReEncrypt: false }
  }
}

function openLibrary(manifest: Manifest): LibraryStore {
  mkdirSync(manifest.dataDir, { recursive: true })
  return LibraryStore.open({ dataDir: manifest.dataDir })
}

function chapterIds(library: LibraryStore, workId: string): string[] {
  return library.listChapters(workId).map((chapter) => chapter.id)
}

// ---------------------------------------------------------------- import và glossary

interface SyosetsuMeta {
  ncode: string
  title: string
  author?: string
  genre?: number
  story?: string
  chapters: Array<{ n: number; title: string }>
}

const SYOSETSU_GENRES: Record<number, string> = {
  101: 'Dị giới · Tình cảm (異世界〔恋愛〕)',
  102: 'Hiện đại · Tình cảm (現実世界〔恋愛〕)',
  201: 'High fantasy (ハイファンタジー)',
  202: 'Low fantasy (ローファンタジー)'
}

interface GlossaryFile {
  note?: string
  entries: Array<{
    source: string
    target: string
    aliases?: string[]
    notes?: string
    forbidden?: boolean
  }>
  /** Nhân vật: `source` là tên gốc, dùng làm khóa cho `dyads`. */
  characters?: Array<{
    source: string
    target: string
    aliases?: string[]
    gender?: CharacterGender
    role?: string
    thirdPerson?: string
    notes?: string
  }>
  /** Cặp xưng hô có chiều; `chapters` dạng "1-20" giới hạn phạm vi áp dụng. */
  dyads?: Array<{
    from: string
    to: string
    self: string
    address: string
    /** Đại từ ngôi hai khi `address` là tên hoặc danh xưng. */
    secondPerson?: string
    formality?: string
    notes?: string
    chapters?: string
  }>
}

function glossaryFileOf(ncode: string): GlossaryFile | null {
  const path = join(LAB, 'glossary', ncode + '.json')
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as GlossaryFile) : null
}

/** Thay toàn bộ thuật ngữ của một bản bằng tệp glossary. Mục đánh dấu `ai` + đã duyệt để đi vào prompt. */
function syncGlossary(library: LibraryStore, workId: string, ncode: string): number {
  const file = glossaryFileOf(ncode)
  const service = new GlossaryService(library, () => Date.now())
  for (const entry of service.list(workId)) {
    if ((entry as ContextEntryItem).kind === 'term') service.delete(workId, entry.id)
  }
  syncAddressing(library, workId, file)
  if (!file) return 0
  // Mira không cho một tên vừa là thuật ngữ vừa là nhân vật; nhân vật thắng vì mang cả giới tính và vai.
  const taken = new Set(
    (file.characters ?? [])
      .flatMap((c) => [c.source, ...(c.aliases ?? [])])
      .map((f) => f.toLowerCase())
  )
  const entries = file.entries.filter(
    (entry) => ![entry.source, ...(entry.aliases ?? [])].some((f) => taken.has(f.toLowerCase()))
  )
  for (const entry of entries) {
    service.create(workId, {
      kind: 'term',
      source: entry.source,
      target: entry.target,
      aliases: entry.aliases ?? [],
      notes: entry.notes ?? null,
      forbidden: entry.forbidden ?? false,
      status: 'approved',
      origin: 'ai'
    })
  }
  return entries.length
}

/** Thay toàn bộ nhân vật và cặp xưng hô của một bản bằng tệp; mọi mục đánh dấu đã duyệt. */
function syncAddressing(library: LibraryStore, workId: string, file: GlossaryFile | null): void {
  const service = new AddressingService(library, () => Date.now())
  for (const dyad of service.listDyads(workId)) service.deleteDyad(workId, dyad.id)
  for (const character of service.listCharacters(workId))
    service.deleteCharacter(workId, character.id)
  if (!file) return
  const ids = new Map<string, string>()
  for (const character of file.characters ?? []) {
    const created = service.createCharacter(workId, {
      source: character.source,
      target: character.target,
      aliases: character.aliases ?? [],
      gender: character.gender ?? 'unknown',
      role: character.role ?? null,
      thirdPerson: character.thirdPerson ?? null,
      notes: character.notes ?? null,
      status: 'approved'
    })
    ids.set(character.source, created.id)
  }
  const chapters = chapterIds(library, workId)
  for (const dyad of file.dyads ?? []) {
    const from = ids.get(dyad.from)
    const to = ids.get(dyad.to)
    if (!from || !to)
      throw new Error(`Cặp xưng hô ${dyad.from} → ${dyad.to}: thiếu nhân vật trong tệp.`)
    const [first, last] = (dyad.chapters ?? '').split('-').map((value) => Number(value))
    service.setDyad(workId, {
      sourceCharacterId: from,
      targetCharacterId: to,
      speakerPronoun: dyad.self,
      recipientPronoun: dyad.address,
      secondPerson: dyad.secondPerson ?? null,
      formality: dyad.formality ?? null,
      notes: dyad.notes ?? null,
      fromChapterId: Number.isInteger(first) ? (chapters[first - 1] ?? null) : null,
      toChapterId: Number.isInteger(last) ? (chapters[last - 1] ?? null) : null,
      status: 'approved'
    })
  }
}

function chapterText(dir: string, n: number, title: string): string {
  const path = join(dir, 'plain', String(n).padStart(4, '0') + '.txt')
  const lines = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n').split('\n')
  // Tệp mở đầu bằng tên chương; tên đã nằm ở chương nên bỏ khỏi bản gốc.
  const first = lines.findIndex((line) => line.trim() !== '')
  if (first !== -1 && lines[first].trim() === title.trim()) lines.splice(0, first + 1)
  return lines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '') + '\n'
}

/**
 * Nạp truyện thành các biến thể còn thiếu. Truyện đã nạp chỉ được thêm biến thể mới; `--replace`
 * lưu trữ mọi bản cũ rồi nạp lại từ đầu.
 */
function importNovel(
  manifest: Manifest,
  library: LibraryStore,
  dir: string,
  labels: string[],
  replace: boolean,
  name?: string
): void {
  const metaPath = join(dir, 'meta.json')
  if (!existsSync(metaPath)) throw new Error('Không thấy meta.json trong ' + dir)
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as SyosetsuMeta
  let novel: NovelEntry | undefined = manifest.novels[meta.ncode]
  if (novel && replace) {
    for (const workId of Object.values(novel.copies)) {
      try {
        library.update(workId, { archived: true })
      } catch {
        // bản cũ đã bị xóa trong app: bỏ qua
      }
    }
    novel = undefined
  }
  novel ??= {
    ncode: meta.ncode,
    title: meta.title,
    dir: resolve(dir),
    chapterCount: meta.chapters.length,
    copies: {},
    stats: {}
  }
  for (const label of labels) {
    const variant = parseVariant(label)
    if (novel.copies[label]) {
      console.log(`${meta.ncode} [${label}]: đã có.`)
      continue
    }
    const work = library.create({
      title: (name ?? `${meta.title} [${label}]`).slice(0, 200),
      originalTitle: meta.title.slice(0, 200),
      sourceLang: 'ja',
      author: meta.author?.slice(0, 200),
      genre: meta.genre ? (SYOSETSU_GENRES[meta.genre] ?? `syosetu ${meta.genre}`) : undefined,
      description: meta.story?.trim().slice(0, DESCRIPTION_MAX)
    })
    for (const chapter of meta.chapters) {
      const created = library.createChapter(work.id, chapter.title).chapter
      const text = chapterText(dir, chapter.n, chapter.title)
      library.saveText(work.id, created.id, 'source', text, 0, segment(text, 'ja'))
    }
    const terms = syncGlossary(library, work.id, meta.ncode)
    novel.copies[label] = work.id
    if (name) novel.names = { ...novel.names, [label]: name }
    console.log(
      `${meta.ncode} [${label}] (${describeVariant(variant)}): ${meta.chapters.length} chương, ${terms} thuật ngữ.`
    )
  }
  manifest.novels[meta.ncode] = novel
}

// ---------------------------------------------------------------- ghi request và chi phí

interface CallRecord {
  ncode: string
  variant: string
  chapter: number
  messages: Array<{ role: string; content: string }>
  status: number
  finish: string | null
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  reasoningTokens: number
  /** Chữ model trả về, để đọc lại nhãn người nói. */
  response?: string
  ms: number
}

/** `fetch` ghi lại mọi lời gọi `/chat/completions` cùng usage, không ghi header nên không lộ khóa. */
function recordingFetch(
  base: typeof fetch,
  context: { ncode: string; variant: string; chapter: number },
  sink: (record: CallRecord) => void
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = Date.now()
    const response = await base(input, init)
    if (typeof init?.body === 'string' && String(input).includes('chat/completions')) {
      const body = JSON.parse(init.body) as { messages?: CallRecord['messages'] }
      let usage: Record<string, unknown> = {}
      let finish: string | null = null
      let content: string | undefined
      try {
        const payload = (await response.clone().json()) as {
          usage?: Record<string, unknown>
          choices?: Array<{ finish_reason?: string; message?: { content?: string } }>
        }
        usage = payload.usage ?? {}
        finish = payload.choices?.[0]?.finish_reason ?? null
        content = payload.choices?.[0]?.message?.content
      } catch {
        // phản hồi không phải JSON (lỗi mạng, stream): vẫn ghi request
      }
      const details = usage['prompt_tokens_details'] as { cached_tokens?: number } | undefined
      const prompt = Number(usage['prompt_tokens'] ?? 0)
      const completion = Number(usage['completion_tokens'] ?? 0)
      const total = Number(usage['total_tokens'] ?? prompt + completion)
      sink({
        ...context,
        messages: body.messages ?? [],
        status: response.status,
        finish,
        inputTokens: prompt,
        cachedTokens: Number(details?.cached_tokens ?? 0),
        outputTokens: completion,
        reasoningTokens: Math.max(0, total - prompt - completion),
        response: content,
        ms: Date.now() - started
      })
    }
    return response
  }) as typeof fetch
}

function usdOf(model: string, calls: CallRecord[]): number {
  let input = 0
  let cached = 0
  let output = 0
  for (const call of calls) {
    cached += call.cachedTokens
    input += call.inputTokens - call.cachedTokens
    output += call.outputTokens + call.reasoningTokens
  }
  return (
    costOfUsage(
      { inputTokens: input, cacheReadTokens: cached, outputTokens: output },
      lookupModel(model, 'google')
    ) ?? 0
  )
}

// ---------------------------------------------------------------- dịch

function setupConnection(
  services: Services,
  key: string,
  model: string,
  baseUrl: string,
  rpm: number,
  thinking: ThinkingLevel | undefined,
  batchTokens = 0
): Promise<{ connectionId: string; entryId: string }> {
  const connection = services.connections.create({
    name: 'Mira Lab',
    baseUrl,
    providerId: 'google'
  })
  return services.connections.addApiKey(connection.id, key).then(() => {
    const view = services.connections.addModels(connection.id, [{ model }])
    const entryId = view.models[view.models.length - 1].id
    services.connections.updateEntry(entryId, {
      settings: {
        rpmLimit: rpm,
        ...(thinking === undefined ? {} : { thinking }),
        ...(batchTokens > 0 ? { inputTokenLimit: batchTokens } : {})
      }
    })
    return { connectionId: connection.id, entryId }
  })
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

async function translateChapter(
  services: Services,
  library: LibraryStore,
  ids: { connectionId: string; entryId: string },
  workId: string,
  chapterId: string,
  force: boolean,
  tag: string
): Promise<{ failed: number; skipped: boolean }> {
  const target = library.readText(workId, chapterId, 'target')
  if (target.content.trim() !== '') {
    if (!force) return { failed: 0, skipped: true }
    library.saveText(workId, chapterId, 'target', '', target.rev, [])
  }
  const translator = services.paragraphTranslator
  const plan = translator.plan({ workId, chapterId, ...ids })
  let failed = 0
  for (const batch of plan.batches) {
    for (let attempt = 1; ; attempt++) {
      const result = await translator.runBatch({
        workId,
        chapterId,
        runId: plan.runId,
        ...ids,
        settingsKey: plan.settingsKey,
        sourceRev: plan.sourceRev,
        targetRev: plan.targetRev,
        targetBaseContent: plan.targetBaseContent,
        policy: 'auto',
        sourceIds: batch.sourceIds
      })
      const limited = result.error?.kind === 'rate_limited' || result.error?.kind === 'quota'
      if (limited && attempt < 8) {
        const wait = Math.max(5_000, (result.error?.recoverAt ?? 0) - Date.now())
        console.log(`${tag}: hạn mức, chờ ${Math.ceil(wait / 1000)} giây rồi thử lại lô`)
        await sleep(Math.min(wait, 120_000))
        continue
      }
      failed += result.failed.length
      if (result.error) console.log(`${tag}: lỗi lô ${result.error.kind} — ${result.error.message}`)
      break
    }
  }
  translator.finalize({ workId, chapterId, runId: plan.runId, policy: 'auto' })
  return { failed, skipped: false }
}

async function translate(manifest: Manifest, args: Args): Promise<void> {
  const key = env('GEMINI_API_KEY')
  if (!key) throw new Error('Thiếu GEMINI_API_KEY (biến môi trường hoặc .env).')
  const model = args.flags.get('model') ?? env('MIRA_LAB_MODEL', 'gemini-2.5-flash')
  const baseUrl =
    args.flags.get('base-url') ??
    env('MIRA_LAB_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai')
  const rpm = Number(args.flags.get('rpm') ?? env('MIRA_LAB_RPM', '8'))
  const concurrency = Math.max(1, Number(args.flags.get('concurrency') ?? '1'))
  // Token đầu vào mỗi lô; đủ lớn thì cả chương đi trong một lô, không có chỗ đứt giữa các lô.
  const batchTokens = Number(args.flags.get('batch-tokens') ?? '0')
  const maxUsd = Number(args.flags.get('max-usd') ?? 'Infinity')
  const force = args.flags.has('force')
  const redoFailed = args.flags.has('redo-failed')
  const parallel = args.flags.has('parallel')
  const novels = pickNovels(manifest, args.positional)
  if (!lookupModel(model, 'google')) {
    console.log(
      `Cảnh báo: không có giá của ${model} trong bảng; giới hạn --max-usd không có tác dụng.`
    )
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const runDir = join(LAB, 'runs', runId)
  mkdirSync(runDir, { recursive: true })
  const library = openLibrary(manifest)
  const startedAll = Date.now()
  const spend = { usd: 0, stopped: false }

  /**
   * Một worker = một kết nối và mục model riêng, dịch tuần tự từng chương nó nhận: fetch ghi request
   * biết chắc lời gọi thuộc chương nào, và RPM tính theo worker.
   */
  async function worker(novel: NovelEntry, variant: Variant, queue: number[]): Promise<void> {
    const context = { ncode: novel.ncode, variant: variant.label, chapter: 0 }
    const calls: CallRecord[] = []
    const sink = (record: CallRecord): void => {
      calls.push(record)
      spend.usd += usdOf(model, [record])
      appendFileSync(
        join(runDir, `${record.ncode}-${record.variant}.jsonl`),
        JSON.stringify(record) + '\n',
        'utf8'
      )
    }
    const services = createServices({
      library,
      crypto: volatileCrypto,
      fetch: recordingFetch(fetch, context, sink)
    })
    const ids = await setupConnection(
      services,
      key,
      model,
      baseUrl,
      rpm,
      variant.thinking,
      batchTokens
    )
    const tag = `${novel.ncode} [${variant.label}]`
    const workId = novel.copies[variant.label]
    const chapters = chapterIds(library, workId)
    try {
      for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
        if (spend.usd >= maxUsd) {
          if (!spend.stopped) console.log(`\nĐã chạm ngân sách $${maxUsd}; dừng nhận chương mới.`)
          spend.stopped = true
          return
        }
        const last = novel.stats[variant.label]?.[String(n)]
        const redo = force || (redoFailed && last !== undefined && last.failed > 0)
        context.chapter = n
        const before = calls.length
        const started = Date.now()
        const outcome = await translateChapter(
          services,
          library,
          ids,
          workId,
          chapters[n - 1],
          redo,
          tag
        )
        if (outcome.skipped) continue
        const mine = calls.slice(before)
        const stats: ChapterStats = {
          at: runId,
          model,
          calls: mine.length,
          inputTokens: mine.reduce((sum, call) => sum + call.inputTokens, 0),
          cachedTokens: mine.reduce((sum, call) => sum + call.cachedTokens, 0),
          outputTokens: mine.reduce((sum, call) => sum + call.outputTokens, 0),
          reasoningTokens: mine.reduce((sum, call) => sum + call.reasoningTokens, 0),
          usd: usdOf(model, mine),
          failed: outcome.failed,
          seconds: Math.round((Date.now() - started) / 100) / 10
        }
        novel.stats[variant.label] = { ...novel.stats[variant.label], [String(n)]: stats }
        writeManifest(manifest)
        console.log(
          `${tag} chương ${n}/${chapters.length}: ${stats.calls} lời gọi, vào ${stats.inputTokens}, ` +
            `ra ${stats.outputTokens} + thinking ${stats.reasoningTokens}, thiếu ${stats.failed} đoạn, ` +
            `${stats.seconds}s · tổng đã tiêu $${spend.usd.toFixed(3)}`
        )
      }
    } finally {
      services.connections.delete(ids.connectionId)
    }
  }

  /** Một luồng = một truyện × một biến thể, chia chương cho `concurrency` worker. */
  async function lane(novel: NovelEntry, variant: Variant): Promise<void> {
    const total = novel.chapterCount
    const queue = parseRange(args.flags.get('chapters'), total)
    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, () =>
        worker(novel, variant, queue)
      )
    )
  }

  const lanes = novels.flatMap((novel) =>
    variantsOf(novel, args.flags).map((variant) => ({ novel, variant }))
  )
  if (lanes.length === 0) throw new Error('Không có biến thể nào để dịch (xem --variants).')
  console.log(
    `Model ${model}; ${lanes.length} luồng × ${concurrency} worker; RPM mỗi worker ${rpm}` +
      (Number.isFinite(maxUsd) ? `; ngân sách $${maxUsd}` : '')
  )
  try {
    if (parallel) {
      const results = await Promise.allSettled(lanes.map((item) => lane(item.novel, item.variant)))
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          const { novel, variant } = lanes[i]
          console.error(`${novel.ncode} [${variant.label}] dừng: ${String(result.reason)}`)
        }
      })
    } else {
      for (const item of lanes) await lane(item.novel, item.variant)
    }
  } finally {
    library.close()
  }
  const minutes = Math.round((Date.now() - startedAll) / 6000) / 10
  console.log(
    `\nXong sau ${minutes} phút, tiêu ≈ $${spend.usd.toFixed(3)}. Request đã gửi: ${runDir}`
  )
}

// ---------------------------------------------------------------- xem prompt không gọi mạng

async function showPrompt(manifest: Manifest, args: Args): Promise<void> {
  const [ncode] = args.positional
  const novel = pickNovels(manifest, [ncode ?? ''])[0]
  const chapter = Number(args.flags.get('chapter') ?? '1')
  const batchIndex = Number(args.flags.get('batch') ?? '1') - 1
  const library = openLibrary(manifest)
  try {
    for (const variant of variantsOf(novel, args.flags)) {
      const seen: Array<Array<{ role: string; content: string }>> = []
      // Endpoint giả trả mảng rỗng: lõi dịch hỏi lại rồi bỏ cuộc, không đề xuất nào được ghi.
      const fake = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: (typeof seen)[number] }
        if (body.messages) seen.push(body.messages)
        return new Response(
          JSON.stringify({ choices: [{ message: { content: '[]' }, finish_reason: 'stop' }] }),
          { status: 200 }
        )
      }) as typeof fetch
      const services = createServices({
        library,
        crypto: volatileCrypto,
        fetch: fake
      })
      const ids = await setupConnection(
        services,
        'dry-run',
        'gemini-2.5-flash',
        'http://127.0.0.1:9/v1',
        0,
        undefined
      )
      try {
        const workId = novel.copies[variant.label]
        const chapterId = chapterIds(library, workId)[chapter - 1]
        const translator = services.paragraphTranslator
        const plan = translator.plan({ workId, chapterId, ...ids })
        const batch = plan.batches[batchIndex]
        if (!batch) throw new Error(`Chương ${chapter} chỉ có ${plan.batches.length} lô.`)
        await translator.runBatch({
          workId,
          chapterId,
          runId: plan.runId,
          ...ids,
          settingsKey: plan.settingsKey,
          sourceRev: plan.sourceRev,
          targetRev: plan.targetRev,
          targetBaseContent: plan.targetBaseContent,
          policy: 'review',
          sourceIds: batch.sourceIds
        })
      } finally {
        services.connections.delete(ids.connectionId)
      }
      const [main, repair] = seen
      console.log(
        `\n==================== ${variant.label} · chương ${chapter} · lô ${batchIndex + 1}`
      )
      for (const message of main ?? []) {
        console.log(`\n----- ${message.role} (${message.content.length} ký tự)\n${message.content}`)
      }
      if (repair && args.flags.has('repair')) {
        console.log('\n----- lượt hỏi lại')
        for (const message of repair) console.log(`\n[${message.role}]\n${message.content}`)
      }
    }
  } finally {
    library.close()
  }
}

// ---------------------------------------------------------------- báo cáo

function paragraphs(text: string): string[] {
  return paragraphUnits(text).map((unit) => unit.text)
}

function glossaryScore(
  source: string[],
  target: string[],
  entries: GlossaryFile['entries']
): { hits: number; checks: number; misses: Map<string, number> } {
  let hits = 0
  let checks = 0
  const misses = new Map<string, number>()
  if (source.length !== target.length) return { hits, checks, misses }
  source.forEach((src, i) => {
    for (const entry of entries) {
      if (entry.forbidden) continue
      const forms = [entry.source, ...(entry.aliases ?? [])]
      if (!forms.some((form) => src.includes(form))) continue
      checks++
      if (target[i].toLowerCase().includes(entry.target.toLowerCase())) hits++
      else misses.set(entry.target, (misses.get(entry.target) ?? 0) + 1)
    }
  })
  return { hits, checks, misses }
}

const pct = (a: number, b: number): string => (b === 0 ? '–' : `${Math.round((a / b) * 100)}%`)

function report(manifest: Manifest, args: Args): void {
  const library = openLibrary(manifest)
  mkdirSync(join(LAB, 'reports'), { recursive: true })
  try {
    for (const novel of pickNovels(manifest, args.positional)) {
      const glossary = glossaryFileOf(novel.ncode)?.entries ?? []
      const variants = variantsOf(novel, args.flags)
      const ids = Object.fromEntries(
        variants.map((v) => [v.label, chapterIds(library, novel.copies[v.label])])
      )
      const textOf = (v: Variant, n: number, side: 'source' | 'target'): string =>
        library.readText(novel.copies[v.label], ids[v.label][n - 1], side).content
      const wanted = parseRange(args.flags.get('chapters'), novel.chapterCount).filter((n) =>
        variants.some((v) => textOf(v, n, 'target').trim() !== '')
      )

      // Tổng hợp theo biến thể
      const summary = variants.map((v) => {
        const stats = Object.values(novel.stats[v.label] ?? {})
        let hits = 0
        let checks = 0
        let mismatched = 0
        let missingParas = 0
        const misses = new Map<string, number>()
        for (const n of wanted) {
          const source = paragraphs(textOf(v, n, 'source'))
          const target = paragraphs(textOf(v, n, 'target'))
          if (target.length === 0) continue
          if (target.length !== source.length) mismatched++
          missingParas += Math.max(0, source.length - target.length)
          const score = glossaryScore(source, target, glossary)
          hits += score.hits
          checks += score.checks
          for (const [term, count] of score.misses)
            misses.set(term, (misses.get(term) ?? 0) + count)
        }
        return {
          v,
          chapters: stats.length,
          hits,
          checks,
          mismatched,
          missingParas,
          failed: stats.reduce((sum, s) => sum + s.failed, 0),
          input: stats.reduce((sum, s) => sum + s.inputTokens, 0),
          output: stats.reduce((sum, s) => sum + s.outputTokens, 0),
          reasoning: stats.reduce((sum, s) => sum + (s.reasoningTokens ?? 0), 0),
          usd: stats.reduce((sum, s) => sum + (s.usd ?? 0), 0),
          seconds: stats.reduce((sum, s) => sum + s.seconds, 0),
          misses
        }
      })

      const lines: string[] = [
        `# ${novel.title} — so sánh biến thể`,
        '',
        `Tạo lúc ${new Date().toISOString()}. Glossary: ${glossary.length} mục (nháp, chưa người dịch duyệt).`,
        'Tuân thủ glossary: đoạn gốc có thuật ngữ thì bản dịch cùng vị trí có đúng chữ dịch không; chỉ tính chương có số đoạn khớp.',
        '',
        '| Biến thể | Cấu hình | Chương | Chương lệch số đoạn | Đoạn thiếu | Glossary | Token vào | Ra | Thinking | USD | Giây |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
      ]
      for (const s of summary) {
        lines.push(
          `| ${s.v.label} | ${describeVariant(s.v)} | ${s.chapters} | ${s.mismatched} | ${s.missingParas} | ` +
            `${pct(s.hits, s.checks)} (${s.hits}/${s.checks}) | ${s.input} | ${s.output} | ${s.reasoning} | ` +
            `$${s.usd.toFixed(3)} | ${Math.round(s.seconds)} |`
        )
      }
      for (const s of summary) {
        const top = [...s.misses].sort((a, b) => b[1] - a[1]).slice(0, 10)
        if (top.length > 0) {
          lines.push(
            '',
            `Thuật ngữ ${s.v.label} hay trượt: ` + top.map(([t, c]) => `${t} (${c})`).join(', ')
          )
        }
      }

      const bodies: string[] = []
      const sideBySide = parseRange(
        args.flags.get('side-by-side') ?? wanted.slice(0, 3).join(','),
        novel.chapterCount
      ).filter((n) => wanted.includes(n))
      for (const n of sideBySide) {
        bodies.push(`\n## Chương ${n}\n`)
        const source = paragraphs(textOf(variants[0], n, 'source'))
        const targets = variants.map((v) => paragraphs(textOf(v, n, 'target')))
        const count = Math.max(source.length, ...targets.map((t) => t.length))
        for (let i = 0; i < count; i++) {
          bodies.push(
            `**${i + 1}.** ${source[i] ?? '∅'}  \n` +
              variants.map((v, j) => `${v.label}: ${targets[j][i] ?? '∅'}`).join('  \n') +
              '\n'
          )
        }
      }
      if (sideBySide.length > 0) {
        lines.push(
          '',
          `Đặt cạnh nhau: chương ${sideBySide.join(', ')} (đổi bằng --side-by-side). Đọc đủ trong tệp txt/PDF.`
        )
      }
      const out = join(LAB, 'reports', `${novel.ncode}.md`)
      writeFileSync(out, [...lines, ...bodies].join('\n') + '\n', 'utf8')
      console.log(`${novel.ncode}: ${wanted.length} chương → ${out}`)
    }
  } finally {
    library.close()
  }
}

// ---------------------------------------------------------------- xuất txt và pdf

/** Tên tệp an toàn trên Windows: bỏ ký tự cấm và cắt ngắn tên truyện dài. */
function fileTitle(title: string): string {
  const clean = title
    .replace(/【[^】]*】/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim()
  return clean.length > 40 ? clean.slice(0, 40).trim() + '…' : clean
}

interface CopyForExport {
  novel: NovelEntry
  variant: Variant
  author: string | null
  heading: string
  chapters: Array<{ id: string; number: number; title: string; content: string }>
  translated: number
  base: string
}

function copiesForExport(library: LibraryStore, manifest: Manifest, args: Args): CopyForExport[] {
  const out: CopyForExport[] = []
  for (const novel of pickNovels(manifest, args.positional)) {
    for (const variant of variantsOf(novel, args.flags)) {
      const workId = novel.copies[variant.label]
      const stats = novel.stats[variant.label] ?? {}
      const models = [...new Set(Object.values(stats).map((item) => item.model))].join(', ')
      const chapters = library.listChapters(workId).map((chapter, index) => ({
        id: chapter.id,
        number: index + 1,
        title: chapter.title,
        content: library.readText(workId, chapter.id, 'target').content.trim()
      }))
      out.push({
        novel,
        variant,
        author: library.get(workId).author,
        heading: `Bản dịch Mira: ${describeVariant(variant)}, model ${models || '—'}`,
        chapters,
        translated: chapters.filter((chapter) => chapter.content !== '').length,
        base: novel.names?.[variant.label]
          ? `${novel.ncode} ${fileTitle(novel.names[variant.label])}`
          : `${novel.ncode} ${fileTitle(novel.title)} [${variant.label}]`
      })
    }
  }
  return out
}

function exportTexts(manifest: Manifest, args: Args): void {
  const library = openLibrary(manifest)
  const outDir = join(LAB, 'export')
  mkdirSync(outDir, { recursive: true })
  try {
    for (const copy of copiesForExport(library, manifest, args)) {
      const header = [
        copy.novel.title,
        `Tác giả: ${copy.author ?? '—'}`,
        copy.heading,
        `Đã dịch: ${copy.translated}/${copy.chapters.length} chương · xuất lúc ${new Date().toLocaleString('vi-VN')}`,
        '',
        ''
      ]
      const body = copy.chapters.flatMap((chapter) => [
        `=== Chương ${chapter.number}: ${chapter.title} ===`,
        '',
        chapter.content || '(chưa dịch)',
        '',
        ''
      ])
      const out = join(outDir, copy.base + '.txt')
      writeFileSync(out, '﻿' + [...header, ...body].join('\r\n'), 'utf8')
      console.log(`${copy.base}: ${copy.translated}/${copy.chapters.length} chương → ${out}`)
    }
  } finally {
    library.close()
  }
}

async function exportPdfs(manifest: Manifest, args: Args): Promise<void> {
  const library = openLibrary(manifest)
  const outDir = join(LAB, 'export')
  mkdirSync(outDir, { recursive: true })
  const jobs: string[] = []
  try {
    for (const copy of copiesForExport(library, manifest, args)) {
      const html = formatAsNovelHtml(
        {
          title: `${copy.novel.title} [${copy.variant.label}]`,
          author: copy.author,
          description:
            `${copy.heading}.\n` +
            `Đã dịch ${copy.translated}/${copy.chapters.length} chương. Xuất lúc ${new Date().toLocaleString('vi-VN')}.`
        },
        copy.chapters.map((chapter) => ({
          ...chapter,
          content: chapter.content || '(chưa dịch)'
        })),
        { includeTitle: true, includeAuthor: true, includeDescription: true, pageSize: 'A5' }
      )
      // HTML tạm đặt tên ASCII: Chromium từng lỗi ERR_FAILED với đường dẫn có dấu ngoặc và chữ Nhật.
      const page = join(outDir, `.${copy.novel.ncode}-${copy.variant.label}.html`)
      writeFileSync(page, html, 'utf8')
      jobs.push(page, join(outDir, copy.base + '.pdf'))
    }
  } finally {
    library.close()
  }
  // Electron chỉ chạy được như một tiến trình riêng; `electron` trong Node trả đường dẫn tới binary.
  const require = createRequire(import.meta.url)
  const electron = require('electron') as unknown as string
  const result = spawnSync(electron, [join(ROOT, 'scripts', 'lab', 'print-pdf.cjs'), ...jobs], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }
  })
  for (let i = 0; i < jobs.length; i += 2) rmSync(jobs[i], { force: true })
  if (result.status !== 0) throw new Error('Electron in PDF lỗi (mã ' + result.status + ').')
}

// ---------------------------------------------------------------- chi phí và tần suất

/**
 * Chi phí lấy từ usage của đề xuất trong kho, không từ log request: Gemini để token thinking ngoài
 * `completion_tokens`, và Mira đã cộng phần đó vào token ra khi lưu đề xuất. Log request chỉ dùng để
 * đếm lời gọi và đo tần suất.
 */
function costReport(manifest: Manifest, args: Args): void {
  const library = openLibrary(manifest)
  const rows: string[][] = []
  let totalUsd = 0
  let totalIn = 0
  let totalOut = 0
  try {
    for (const novel of pickNovels(manifest, args.positional)) {
      for (const variant of variantsOf(novel, args.flags)) {
        const workId = novel.copies[variant.label]
        const usages = library.withWork(workId, (db) =>
          db
            .prepare("SELECT usage_json FROM proposal WHERE origin = 'translate'")
            .all<{ usage_json: string | null }>()
        )
        let input = 0
        let output = 0
        for (const row of usages) {
          if (!row.usage_json) continue
          const usage = JSON.parse(row.usage_json) as {
            inputTokens?: number
            outputTokens?: number
          }
          input += usage.inputTokens ?? 0
          output += usage.outputTokens ?? 0
        }
        const stats = Object.values(novel.stats[variant.label] ?? {})
        const model = stats[0]?.model ?? 'gemini-2.5-flash'
        const usd =
          costOfUsage({ inputTokens: input, outputTokens: output }, lookupModel(model, 'google')) ??
          0
        const visibleOut = stats.reduce((sum, item) => sum + item.outputTokens, 0)
        totalUsd += usd
        totalIn += input
        totalOut += output
        rows.push([
          `${novel.ncode} [${variant.label}]`,
          model,
          `${stats.length}/${novel.chapterCount}`,
          String(input),
          String(output),
          `${Math.max(0, output - visibleOut)}`,
          `$${usd.toFixed(4)}`
        ])
      }
    }
  } finally {
    library.close()
  }
  console.log(
    'Bản | model | chương xong | token vào | token ra (gồm thinking) | trong đó thinking | USD'
  )
  for (const row of rows) console.log(row.join(' | '))
  console.log(
    `Tổng: vào ${totalIn}, ra ${totalOut}, ≈ $${totalUsd.toFixed(4)} (giá theo bảng models.dev trong repo)`
  )

  // Tần suất: mỗi tệp jsonl là một luồng; thời lượng = từ lúc bắt đầu lần chạy tới lời gọi cuối.
  const runsDir = join(LAB, 'runs')
  if (!existsSync(runsDir)) return
  for (const run of readdirSync(runsDir).sort()) {
    const started = Date.parse(run.replace(/T(\d\d)-(\d\d)-(\d\d)-(\d+)Z$/, 'T$1:$2:$3.$4Z'))
    let calls = 0
    let busyMs = 0
    let last = started
    const lanes: string[] = []
    for (const file of readdirSync(join(runsDir, run))) {
      const path = join(runsDir, run, file)
      const records = readFileSync(path, 'utf8').split('\n').filter(Boolean)
      calls += records.length
      for (const line of records) busyMs += (JSON.parse(line) as CallRecord).ms
      last = Math.max(last, statSync(path).mtimeMs)
      lanes.push(`${file.replace('.jsonl', '')} ${records.length}`)
    }
    const minutes = (last - started) / 60_000
    if (calls === 0 || minutes <= 0) continue
    console.log(
      `\nLần chạy ${run}: ${calls} lời gọi trong ${minutes.toFixed(1)} phút ≈ ${(calls / minutes).toFixed(1)} lời gọi/phút ` +
        `(${lanes.length} luồng), mỗi lời gọi trung bình ${(busyMs / calls / 1000).toFixed(1)} giây`
    )
    console.log('  ' + lanes.join(', '))
  }
}

// ---------------------------------------------------------------- phân tích xưng hô

/**
 * Đề xuất nhân vật và cặp xưng hô đủ ô kèm bằng chứng. Ghi ra tệp để duyệt; \`--apply\` chỉ điền
 * những ô còn trống trong tệp glossary và thêm cặp mới, không ghi đè lựa chọn đã có.
 */
async function analyze(manifest: Manifest, args: Args): Promise<void> {
  const key = env('GEMINI_API_KEY')
  if (!key) throw new Error('Thiếu GEMINI_API_KEY (biến môi trường hoặc .env).')
  const model = args.flags.get('model') ?? env('MIRA_LAB_ANALYSIS_MODEL', 'gemini-3.1-flash-lite')
  const baseUrl =
    args.flags.get('base-url') ??
    env('MIRA_LAB_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai')
  const library = openLibrary(manifest)
  mkdirSync(join(LAB, 'analysis'), { recursive: true })
  try {
    for (const novel of pickNovels(manifest, args.positional)) {
      const file = glossaryFileOf(novel.ncode)
      const characters = file?.characters ?? []
      if (characters.length === 0) {
        console.log(`${novel.ncode}: tệp glossary chưa có nhân vật nào, bỏ qua.`)
        continue
      }
      const workId = Object.values(novel.copies)[0]
      const work = library.get(workId)
      const ids = chapterIds(library, workId)
      const wanted = parseRange(args.flags.get('chapters') ?? '1-30', ids.length)
      const chapters = wanted.map((n) => ({
        number: n,
        text: library.readText(workId, ids[n - 1], 'source').content
      }))
      const register = suggestRegister(work.sourceLang, work.genre)
      const evidence = collectAddressingEvidence(chapters, characters, work.sourceLang)
      const messages = buildAnalysisMessages({
        sourceLang: work.sourceLang,
        register,
        characters,
        evidence
      })

      const services = createServices({ library, crypto: volatileCrypto, fetch })
      const connection = await setupConnection(services, key, model, baseUrl, 30, undefined)
      let text = ''
      let usd = 0
      try {
        const provider = services.connections.translator(
          connection.connectionId,
          connection.entryId
        ).provider as unknown as TranslationModelCaller
        const result = await provider.complete(messages)
        text = result.text
        const usage = result.usage as { inputTokens?: number; outputTokens?: number } | null
        usd =
          costOfUsage(
            { inputTokens: usage?.inputTokens ?? 0, outputTokens: usage?.outputTokens ?? 0 },
            lookupModel(model, 'google')
          ) ?? 0
      } finally {
        services.connections.delete(connection.connectionId)
      }
      const result = parseAnalysis(text)
      const out = join(LAB, 'analysis', `${novel.ncode}.json`)
      writeFileSync(
        out,
        JSON.stringify(
          {
            ncode: novel.ncode,
            model,
            register,
            chapters: wanted,
            at: new Date().toISOString(),
            ...result
          },
          null,
          2
        ) + '\n',
        'utf8'
      )
      console.log(
        `\n${novel.ncode}: ${result.characters.length} nhân vật, ${result.dyads.length} cặp, ≈ $${usd.toFixed(4)} → ${out}`
      )
      for (const dyad of result.dyads) {
        const second = dyad.secondPerson ? `, ngôi hai "${dyad.secondPerson}"` : ''
        console.log(
          `  ${dyad.from} → ${dyad.to}: "${dyad.self}" – "${dyad.address}"${second} [${dyad.confidence ?? '?'}]`
        )
      }

      if (args.flags.has('apply') && file) {
        let filled = 0
        let added = 0
        for (const proposed of result.characters) {
          const current = characters.find((c) => c.source === proposed.source)
          if (!current) continue
          if (!current.thirdPerson && proposed.thirdPerson) {
            current.thirdPerson = proposed.thirdPerson
            filled++
          }
          if ((!current.gender || current.gender === 'unknown') && proposed.gender) {
            current.gender = proposed.gender as CharacterGender
            filled++
          }
        }
        file.dyads ??= []
        for (const proposed of result.dyads) {
          if (
            !characters.some((c) => c.source === proposed.from) ||
            !characters.some((c) => c.source === proposed.to)
          )
            continue
          const current = file.dyads.find((d) => d.from === proposed.from && d.to === proposed.to)
          if (current) {
            if (!current.secondPerson && proposed.secondPerson && !isPronounLike(current.address)) {
              current.secondPerson = proposed.secondPerson
              filled++
            }
          } else {
            file.dyads.push({
              from: proposed.from,
              to: proposed.to,
              self: proposed.self,
              address: proposed.address,
              ...(proposed.secondPerson ? { secondPerson: proposed.secondPerson } : {}),
              notes: ['AI đề xuất, chờ duyệt', proposed.notes].filter(Boolean).join('. ')
            })
            added++
          }
        }
        const path = join(LAB, 'glossary', novel.ncode + '.json')
        writeFileSync(path, JSON.stringify(file, null, 2) + '\n', 'utf8')
        console.log(
          `  Đã điền ${filled} ô trống và thêm ${added} cặp vào ${path}. Chạy "glossary ${novel.ncode}" để nạp.`
        )
      }
    }
  } finally {
    library.close()
  }
}

// ---------------------------------------------------------------- chấm cặp xưng hô

const PRONOUN_CANDIDATES = [
  'tôi',
  'tao',
  'tớ',
  'mình',
  'ta',
  'anh',
  'em',
  'chị',
  'cậu',
  'mày',
  'ngài',
  'cô',
  'ông',
  'bà',
  'ngươi',
  'con'
]

/** Đại từ đứng riêng trong câu; bỏ dạng nhắc tên hay ngôi ba ("chị Claire", "anh ấy", "em gái"). */
function pronounsIn(text: string): string[] {
  const found: string[] = []
  const lower = text.toLowerCase()
  for (const word of PRONOUN_CANDIDATES) {
    const pattern = new RegExp(`(^|[^\\p{L}])${word}(?=[^\\p{L}]|$)`, 'gu')
    for (const match of lower.matchAll(pattern)) {
      const after = text.slice(
        (match.index ?? 0) + match[0].length,
        (match.index ?? 0) + match[0].length + 12
      )
      if (/^ (ấy|ta|trai|gái|họ|nhà)\b/.test(after) || /^ \p{Lu}/u.test(after)) continue
      found.push(word)
    }
  }
  return found
}

function allowedWords(dyad: { self: string; address: string; secondPerson?: string }): Set<string> {
  return new Set(
    [dyad.self, dyad.address, dyad.secondPerson ?? '']
      .join(' ')
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter(Boolean)
  )
}

/**
 * Chấm độ khớp cặp xưng hô: nhãn "người nói→người nghe" lấy từ phản hồi của một bản \`v3\`
 * (\`--labels\`), áp lên bản dịch của mọi biến thể cùng truyện theo chữ của đoạn gốc.
 */
function pairs(manifest: Manifest, args: Args): void {
  const [ncode] = args.positional
  const novel = pickNovels(manifest, [ncode ?? ''])[0]
  const labelVariant = args.flags.get('labels')
  if (!labelVariant) throw new Error('Cần --labels <biến thể có nhãn người nói>.')
  const file = glossaryFileOf(novel.ncode)
  const nameOf = new Map((file?.characters ?? []).map((c) => [c.source, c.target]))
  const dyads = new Map(
    (file?.dyads ?? []).map((d) => [
      `${nameOf.get(d.from) ?? d.from}→${nameOf.get(d.to) ?? d.to}`,
      d
    ])
  )
  // Nhãn: chữ gốc → "A→B", lấy từ mọi lần chạy, lần sau đè lần trước.
  const labels = new Map<string, string>()
  const runsDir = join(LAB, 'runs')
  for (const run of existsSync(runsDir) ? readdirSync(runsDir).sort() : []) {
    const path = join(runsDir, run, `${novel.ncode}-${labelVariant}.jsonl`)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n').filter(Boolean)) {
      const record = JSON.parse(line) as CallRecord
      const user = record.messages.find((m) => m.role === 'user')?.content ?? ''
      // Bản chạy cũ gói nguồn trong thẻ `<nguon>`; vẫn đọc được các lần chạy đã lưu.
      const source = /<(?:source|nguon)>\n([\s\S]*?)\n<\/(?:source|nguon)>/.exec(user)?.[1]
      if (!source || !record.response) continue
      try {
        const sent = JSON.parse(source) as Array<{ id: string; src: string }>
        const got = JSON.parse(
          sanitizeJsonString(record.response.replace(/```(?:json)?/g, '').trim())
        ) as Array<{
          id: string
          speaker_to_listener?: string
          noi?: string
        }>
        const srcById = new Map(sent.map((item) => [item.id, item.src]))
        for (const item of got) {
          const src = srcById.get(item.id)
          // Bản chạy cũ ghi nhãn ở khóa `noi`; vẫn đọc được để dùng lại các lần chạy đã lưu.
          const label = item.speaker_to_listener ?? item.noi
          if (src && label && !label.includes('?')) labels.set(src.trim(), label.replace(/\s/g, ''))
        }
      } catch {
        // phản hồi hỏng: bỏ qua lần gọi này
      }
    }
  }
  console.log(`${novel.ncode}: ${labels.size} câu thoại có nhãn từ ${labelVariant}.`)

  const library = openLibrary(manifest)
  try {
    for (const variant of variantsOf(novel, args.flags)) {
      const workId = novel.copies[variant.label]
      const ids = chapterIds(library, workId)
      let checked = 0
      let off = 0
      const byPair = new Map<string, { checked: number; off: number; example?: string }>()
      for (const n of parseRange(args.flags.get('chapters'), ids.length)) {
        const source = paragraphs(library.readText(workId, ids[n - 1], 'source').content)
        const target = paragraphs(library.readText(workId, ids[n - 1], 'target').content)
        if (target.length !== source.length) continue
        source.forEach((src, i) => {
          const label = labels.get(src.trim())
          const dyad = label ? dyads.get(label) : undefined
          if (!label || !dyad) return
          const allowed = allowedWords(dyad)
          const bad = pronounsIn(target[i]).filter((word) => !allowed.has(word))
          const stat = byPair.get(label) ?? { checked: 0, off: 0 }
          stat.checked++
          checked++
          if (bad.length > 0) {
            stat.off++
            off++
            stat.example ??= `ch${n}: ${target[i].slice(0, 90)} [${bad.join(', ')}]`
          }
          byPair.set(label, stat)
        })
      }
      console.log(`\n[${variant.label}] lệch cặp: ${off}/${checked} câu (${pct(off, checked)})`)
      for (const [label, stat] of [...byPair].sort((a, b) => b[1].off - a[1].off)) {
        console.log(
          `  ${label}: ${stat.off}/${stat.checked}${stat.example ? '  vd: ' + stat.example : ''}`
        )
      }
    }
  } finally {
    library.close()
  }
}

// ---------------------------------------------------------------- lệnh

/** Ô còn trống trong dữ liệu xưng hô của mỗi truyện — chỗ model sẽ phải tự đoán. */
function gaps(manifest: Manifest, args: Args): void {
  const library = openLibrary(manifest)
  try {
    for (const novel of pickNovels(manifest, args.positional)) {
      const workId = Object.values(novel.copies)[0]
      const service = new AddressingService(library, () => Date.now())
      const found = addressingGaps(service.listCharacters(workId), service.listDyads(workId))
      console.log(`
${novel.ncode}: ${found.length} ô trống`)
      for (const gap of found) console.log('  - ' + gap.message)
    }
  } finally {
    library.close()
  }
}

function list(manifest: Manifest): void {
  const library = openLibrary(manifest)
  try {
    console.log('Thư viện lab: ' + manifest.dataDir)
    for (const novel of Object.values(manifest.novels)) {
      const done = Object.entries(novel.copies).map(([label, workId]) => {
        const ids = chapterIds(library, workId)
        const translated = ids.filter(
          (id) => library.readText(workId, id, 'target').content.trim() !== ''
        ).length
        return `${label} ${translated}/${ids.length}`
      })
      console.log(`${novel.ncode}  ${novel.title}  ·  đã dịch: ${done.join(', ')}`)
    }
  } finally {
    library.close()
  }
}

const HELP = `Mira Lab — thử prompt và cấu hình model trên truyện thật

Biến thể: nhãn tự đặt, thêm mức thinking sau dấu "-": a (thinking mặc định), a-nothink, a-think (= ${THINK_LEVEL}), a-low…
Thêm "+nhãn" để giữ nhiều lần thử cạnh nhau: a-nothink+ctx.

  import <thư mục truyện…> [--variants base] [--replace] [--name "Tên tiếng Việt"]
      Nạp truyện syosetsu-downloader (meta.json + plain/*.txt) thành các biến thể còn thiếu,
      kèm glossary ở fixtures/private/lab/glossary/<ncode>.json.
  glossary [ncode…|all]
      Nạp lại glossary, nhân vật và cặp xưng hô từ tệp cho mọi bản (thay toàn bộ).
  prompt <ncode> [--chapter 1] [--batch 1] [--variants base] [--repair]
      In đúng prompt sẽ gửi, không gọi mạng, không tốn token.
  translate [ncode…|all] [--variants …] [--chapters 1-3] [--model gemini-2.5-flash]
            [--parallel] [--concurrency 1] [--rpm 8] [--max-usd 5] [--batch-tokens 16000]
            [--force] [--redo-failed]
      Dịch thật qua đường của UI; cần GEMINI_API_KEY. Mỗi request ghi vào fixtures/private/lab/runs/.
      --parallel: mỗi truyện × biến thể một luồng; --concurrency: số chương dịch cùng lúc mỗi luồng;
      --max-usd: dừng nhận chương mới khi chi phí (gồm thinking) chạm mức này.
  report [ncode…|all] [--variants …] [--side-by-side 1-3]
      So các biến thể: số đoạn, tuân thủ glossary, token, thinking, chi phí; vài chương đặt cạnh nhau.
  export | pdf [ncode…|all] [--variants …]
      Xuất mỗi bản ra txt, hoặc PDF khổ A5 cùng định dạng ebook của module Xuất.
  analyze [ncode…|all] [--chapters 1-30] [--model gemini-3.1-flash-lite] [--apply]
      AI đề xuất giới tính, đại từ ngôi ba và cặp xưng hô đủ ô kèm câu bằng chứng, ghi vào
      fixtures/private/lab/analysis/<ncode>.json; --apply điền ô trống và thêm cặp mới vào tệp glossary.
  pairs <ncode> --labels <biến thể> [--variants …] [--chapters 1-10]
      Chấm số câu thoại lệch cặp xưng hô đã chốt, dùng nhãn người nói của một biến thể.
  gaps [ncode…|all]
      Ô còn trống trong nhân vật và cặp xưng hô (thiếu đại từ ngôi hai, ngôi ba, giới tính).
  cost [ncode…|all]
      Token, chi phí (gồm thinking) và tần suất gọi của các lần chạy.
  list | open
      Tình trạng từng bản; lệnh mở thư viện lab bằng app Mira.
`

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const manifest = readManifest()
  switch (args.command) {
    case 'import': {
      if (args.positional.length === 0) throw new Error('Cần ít nhất một thư mục truyện.')
      const labels = (args.flags.get('variants') ?? DEFAULT_VARIANTS.join(','))
        .split(',')
        .map((value) => value.trim())
      labels.forEach(parseVariant)
      const library = openLibrary(manifest)
      try {
        for (const dir of args.positional) {
          importNovel(
            manifest,
            library,
            dir,
            labels,
            args.flags.has('replace'),
            args.flags.get('name')
          )
          writeManifest(manifest)
        }
      } finally {
        library.close()
      }
      return
    }
    case 'glossary': {
      const library = openLibrary(manifest)
      try {
        for (const novel of pickNovels(manifest, args.positional)) {
          for (const [label, workId] of Object.entries(novel.copies)) {
            const count = syncGlossary(library, workId, novel.ncode)
            console.log(`${novel.ncode} [${label}]: ${count} thuật ngữ.`)
          }
        }
      } finally {
        library.close()
      }
      return
    }
    case 'prompt':
      return showPrompt(manifest, args)
    case 'translate':
      return translate(manifest, args)
    case 'report':
      return report(manifest, args)
    case 'export':
      return exportTexts(manifest, args)
    case 'pdf':
      return exportPdfs(manifest, args)
    case 'cost':
      return costReport(manifest, args)
    case 'analyze':
      return analyze(manifest, args)
    case 'pairs':
      return pairs(manifest, args)
    case 'gaps':
      return gaps(manifest, args)
    case 'list':
      return list(manifest)
    case 'open':
      console.log('PowerShell:')
      console.log(
        `  $env:MIRA_DATA_DIR = "${manifest.dataDir}"; node_modules\\.bin\\electron-vite dev`
      )
      console.log('Git Bash:')
      console.log(`  MIRA_DATA_DIR="${manifest.dataDir}" node_modules/.bin/electron-vite dev`)
      return
    default:
      console.log(HELP)
      if (args.command !== 'help') process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
