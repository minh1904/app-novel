/**
 * Chạy thử Bộ đo: baseline của **đường dịch MVP** trên mọi chương fixture. Đây là mã tạm, sẽ được thay bằng
 * module Bộ đo (lộ trình 2026-10-03); chỉ có tầng kiểm tất định (T0, ở `score.ts`), chưa có giám khảo LLM hay
 * người chấm.
 *
 * Đi đúng đường của app: chuẩn hóa raw như lúc nhập → chia câu bằng `segment()` → kết nối và mục model
 * **không đặt tham số nào** (như mục mặc định trong app) → `translator.plan` → `runBatch` từng lô, tuần tự →
 * đọc bản dịch đã ráp → chấm. Lô lỗi được gửi lại đúng một lần (như người dùng bấm "Dịch lại phần lỗi").
 *
 *   node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/baseline.run.ts
 *
 * Biến môi trường, đọc từ `.env` ở gốc repo nếu không có trong môi trường:
 *   GEMINI_API_KEY (bắt buộc) · MIRA_BENCH_MODEL (mặc định gemini-2.5-flash) · MIRA_BENCH_REPEATS (3)
 *   MIRA_BENCH_RPM (8) · MIRA_BENCH_ONLY (chỉ chạy tác phẩm có tên chứa chuỗi này)
 *
 * Kết quả ghi vào `fixtures/private/runs/<thời điểm>/` (bị ignore vì có văn bản truyện). Khóa chỉ nằm trong bộ
 * nhớ; mọi tệp ghi ra được kiểm là không chứa khóa.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeRaw } from '../../src/shared/algorithms/rawText'
import { segment } from '../../src/shared/algorithms/segmenter'
import type { SecretCrypto } from '../../src/main/infra/storage/secretStore'
import { SYSTEM_PROMPT } from '../../src/main/infra/providers/openAiCompatible'
import { LibraryStore } from '../../src/main/services/library/library'
import { createServices } from '../../src/main/services/createServices'
import { loadChapters, pct, reportTable, score, summarize, type Score } from './score'

const ROOT = process.cwd()

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

const KEY = env('GEMINI_API_KEY')
const MODEL = env('MIRA_BENCH_MODEL', 'gemini-2.5-flash')
const REPEATS = Number(env('MIRA_BENCH_REPEATS', '3'))
const RPM = Number(env('MIRA_BENCH_RPM', '8'))
const ONLY = env('MIRA_BENCH_ONLY')
const BASE_URL = env(
  'MIRA_BENCH_BASE_URL',
  'https://generativelanguage.googleapis.com/v1beta/openai'
)
/**
 * Thí nghiệm prompt: tệp chứa system prompt thay cho `SYSTEM_PROMPT` của app. Chỉ nội dung system message đổi;
 * chia lô, định dạng JSON, parse, `reconcile` và gateway vẫn là của app, nên đây là phép đổi một biến.
 */
const PROMPT_FILE = env('MIRA_BENCH_PROMPT')
const PROMPT =
  PROMPT_FILE === ''
    ? null
    : readFileSync(join(ROOT, PROMPT_FILE), 'utf8').replace(/\r\n?/g, '\n').trim()
/**
 * Thí nghiệm mức suy luận: đặt `thinking` của mục model như người dùng làm ở màn Cài đặt (`off` gửi đi thành
 * `reasoning_effort: "none"`). Trống là không đặt gì, như mục mặc định.
 */
const THINKING = env('MIRA_BENCH_THINKING')
const LABEL = env(
  'MIRA_BENCH_LABEL',
  [PROMPT_FILE === '' ? '' : 'prompt', THINKING === '' ? '' : `thinking-${THINKING}`]
    .filter(Boolean)
    .join('-') || 'baseline'
)

const crypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  async encrypt(plain) {
    return new Uint8Array([...Buffer.from(plain, 'utf-8')].map((b) => b ^ 0xff))
  },
  async decrypt(cipher) {
    return {
      value: Buffer.from([...cipher].map((b) => b ^ 0xff)).toString('utf-8'),
      shouldReEncrypt: false
    }
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function addUsage(total: Record<string, number>, usage: unknown): void {
  if (usage === null || typeof usage !== 'object') return
  for (const [key, value] of Object.entries(usage as Record<string, unknown>)) {
    if (typeof value === 'number') total[key] = (total[key] ?? 0) + value
  }
}

function gitCommit(): string {
  try {
    return (
      execSync('git rev-parse --short HEAD', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim() || 'unknown'
    )
  } catch {
    return 'unknown'
  }
}

describe.skipIf(KEY === '')(`Bộ đo — baseline đường dịch MVP (${MODEL})`, () => {
  it('dịch mọi chương fixture và chấm bằng kiểm tất định', async () => {
    const chapters = loadChapters(ROOT, ONLY)
    expect(chapters.length).toBeGreaterThan(0)

    const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${LABEL}`
    const runDir = join(ROOT, 'fixtures', 'private', 'runs', runId)
    mkdirSync(runDir, { recursive: true })
    const write = (rel: string, text: string): void => {
      if (KEY !== '' && text.includes(KEY)) throw new Error('khóa lọt vào tệp kết quả: dừng')
      const path = join(runDir, rel)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, text, 'utf8')
    }
    const commit = gitCommit()
    write(
      'config.json',
      JSON.stringify(
        {
          runId,
          label: LABEL,
          commit,
          model: MODEL,
          baseUrl: BASE_URL,
          repeats: REPEATS,
          rpm: RPM,
          promptFile: PROMPT_FILE || null,
          thinking: THINKING || null,
          systemPrompt: PROMPT ?? SYSTEM_PROMPT
        },
        null,
        2
      )
    )
    let replaced = 0
    // Tham số của yêu cầu dịch đầu tiên (trừ messages): bằng chứng cái gì thật sự đã được gửi đi.
    let sentParams: Record<string, unknown> | null = null

    const dataDir = mkdtempSync(join(tmpdir(), 'mira-bench-'))
    const library = LibraryStore.open({ dataDir })
    const http: number[] = []
    const counting = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body) as {
          messages?: Array<{ role: string; content: unknown }>
        }
        const system = body.messages?.[0]
        if (sentParams === null && system?.role === 'system') {
          sentParams = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'messages'))
        }
        if (PROMPT !== null && system?.role === 'system' && system.content === SYSTEM_PROMPT) {
          system.content = PROMPT
          replaced++
          init = { ...init, body: JSON.stringify(body) }
        }
      }
      const response = await fetch(input, init)
      http.push(response.status)
      return response
    }) as typeof fetch
    const services = createServices({ library, crypto, fetch: counting })
    const connection = services.connections.create({
      name: 'Bộ đo',
      baseUrl: BASE_URL,
      providerId: 'google'
    })
    await services.connections.addApiKey(connection.id, KEY)
    const entryId = services.connections.addModels(connection.id, [
      { model: MODEL, name: 'baseline' }
    ]).models[0]!.id
    // RPM chỉ giãn nhịp gửi, không vào settingsKey và không đổi nội dung yêu cầu.
    services.connections.updateEntry(entryId, {
      settings: THINKING === '' ? { rpmLimit: RPM } : { rpmLimit: RPM, thinking: THINKING }
    })

    const summary: Array<Record<string, unknown>> = []
    try {
      for (const chapter of chapters) {
        const normalized = normalizeRaw(chapter.source).text
        const scores: Score[] = []
        const usage: Record<string, number> = {}
        const errors: Array<Record<string, unknown>> = []
        let ms = 0
        let httpCalls = 0
        for (let rep = 1; rep <= REPEATS; rep++) {
          const label = `${chapter.work}/${chapter.id} #${rep}`
          const callsBefore = http.length
          const started = Date.now()
          try {
            const work = library.create({ title: label, sourceLang: chapter.lang })
            const created = library.createChapter(work.id, chapter.id).chapter
            library.saveText(
              work.id,
              created.id,
              'source',
              normalized,
              0,
              segment(normalized, chapter.lang)
            )
            const plan = services.translator.plan({
              workId: work.id,
              chapterId: created.id,
              connectionId: connection.id,
              entryId
            })
            let rev = plan.targetRev
            let written = 0
            for (const batch of plan.batches) {
              let ids = batch.sourceIds
              for (let attempt = 1; attempt <= 2 && ids.length > 0; attempt++) {
                const result = await services.translator.runBatch({
                  workId: work.id,
                  chapterId: created.id,
                  connectionId: connection.id,
                  entryId,
                  settingsKey: plan.settingsKey,
                  sourceIds: ids,
                  expectedRev: rev
                })
                rev = result.targetRev
                written += result.written.length
                addUsage(usage, result.usage)
                if (result.error !== null) {
                  errors.push({
                    rep,
                    attempt,
                    kind: result.error.kind,
                    failed: result.failed.length,
                    message: result.error.message.slice(0, 160)
                  })
                  if (result.error.recoverAt !== null)
                    await sleep(
                      Math.min(70_000, Math.max(1_000, result.error.recoverAt - Date.now()))
                    )
                }
                ids = result.failed
              }
            }
            const target = library.readText(work.id, created.id, 'target').content
            const s = score(chapter, normalized, target, plan.segmentCount, written)
            scores.push(s)
            write(`${chapter.work}/${chapter.id}/rep-${rep}.vi.txt`, target + '\n')
            write(`${chapter.work}/${chapter.id}/rep-${rep}.json`, JSON.stringify(s, null, 2))
            console.log(
              `${label}: ${s.targetParagraphs}/${s.sourceParagraphs} đoạn, ${s.written}/${s.segments} câu, ` +
                `glossary ${pct(s.glossaryStrict, s.glossaryChecked)}, sót chữ nguồn ${s.residue}, ngoặc lệch ${s.quoteUnbalanced}, ` +
                `${Math.round((Date.now() - started) / 1000)} s`
            )
          } catch (error) {
            errors.push({
              rep,
              attempt: 0,
              kind: 'exception',
              message: String(error).slice(0, 200)
            })
            console.log(`${label}: LỖI ${String(error).slice(0, 200)}`)
          }
          ms += Date.now() - started
          httpCalls += http.length - callsBefore
        }
        summary.push(
          summarize(chapter, scores, { usage, httpCalls, seconds: Math.round(ms / 1000), errors })
        )
      }
    } finally {
      library.close()
      rmSync(dataDir, { recursive: true, force: true })
    }

    // Có tệp prompt mà không lần nào thay được thì thí nghiệm vô nghĩa: báo to thay vì ghi số như thật.
    if (PROMPT !== null) expect(replaced).toBeGreaterThan(0)
    write(
      'report.json',
      JSON.stringify(
        {
          model: MODEL,
          label: LABEL,
          commit,
          repeats: REPEATS,
          promptReplaced: replaced,
          sentParams,
          httpStatuses: http,
          summary
        },
        null,
        2
      )
    )
    write(
      'report.md',
      reportTable(
        `# ${LABEL} ${MODEL} (${runId}, commit ${commit}, ${REPEATS} lần mỗi chương)`,
        summary
      )
    )
    console.log(`\nKết quả: ${runDir}`)
    console.log(
      `HTTP: ${http.length} lời gọi, mã: ${JSON.stringify(Object.fromEntries([...new Set(http)].map((c) => [c, http.filter((x) => x === c).length])))}`
    )
  })
})
