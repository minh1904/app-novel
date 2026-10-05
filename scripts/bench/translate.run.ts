/**
 * Translation runner for measurement harness (spec measure-runs).
 * Translates fixture chapters using the app's real translation pipeline:
 * normalizeRaw -> segment -> plan -> gateway -> align -> T0 checks.
 *
 * Replaces baseline.run.ts.
 */

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeRaw } from '../../src/shared/algorithms/rawText'
import { segment } from '../../src/shared/algorithms/segmenter'
import type { SecretCrypto } from '../../src/main/infra/storage/secretStore'
import { parsePromptVersion } from '../../src/main/services/ai/promptVersion'
import { LibraryStore } from '../../src/main/services/library/library'
import { createServices } from '../../src/main/services/createServices'
import { loadFixtures } from './fixtures'
import { extractParagraphs } from '../../src/shared/algorithms/fixtureCheck'
import { alignParagraphs } from '../../src/shared/algorithms/paragraphAlign'
import {
  checkStructure,
  checkResidualSourceChars,
  checkUnbalancedQuotes,
  classifyDialogueStyle,
  checkLengthOutliers,
  checkRepetitions,
  checkGlossaryCompliance,
  evaluateAssertions
} from '../../src/shared/algorithms/translationChecks'
import { assertNoSecret } from '../../src/shared/algorithms/secretGuard'
import { getWorkId, normalizeGlossaryEntries, normalizeAssertionRules } from '../../src/shared/contracts/fixture'

const ROOT = process.cwd()

function loadEnvFile(): Record<string, string> {
  const envPath = join(ROOT, '.env')
  const out: Record<string, string> = {}
  if (!existsSync(envPath)) return out
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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
const PROMPT_FILE = env('MIRA_BENCH_PROMPT')
const PROMPT =
  PROMPT_FILE === ''
    ? null
    : readFileSync(join(ROOT, PROMPT_FILE), 'utf8').replace(/\r\n?/g, '\n').trim()
const THINKING = env('MIRA_BENCH_THINKING')
const PROMPT_VERSION = parsePromptVersion(env('MIRA_BENCH_PROMPT_VERSION'))
if (PROMPT_VERSION === null) {
  throw new Error(`MIRA_BENCH_PROMPT_VERSION không hợp lệ: ${env('MIRA_BENCH_PROMPT_VERSION')}`)
}
const LABEL = env(
  'MIRA_BENCH_LABEL',
  [
    PROMPT_FILE === '' ? '' : 'prompt',
    PROMPT_VERSION === 'v1' ? '' : `prompt-${PROMPT_VERSION}`,
    THINKING === '' ? '' : `thinking-${THINKING}`
  ]
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

function gitCommit(): string {
  try {
    return (
      execSync('git rev-parse HEAD', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim() || 'unknown'
    )
  } catch {
    return 'unknown'
  }
}

describe.skipIf(KEY === '')(`Bộ đo — dịch theo điều kiện (${MODEL})`, () => {
  it(
    'dịch các chương fixture và ghi hồ sơ tái hiện',
    { timeout: 600_000 },
    async () => {
    const { works } = loadFixtures({
      onlyWorkIds: ONLY ? ONLY.split(',').map((s) => s.trim()) : undefined
    })
    expect(works.length).toBeGreaterThan(0)

    const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${LABEL}`
    const runDir = join(ROOT, 'fixtures', 'private', 'runs', runId)
    mkdirSync(runDir, { recursive: true })

    const knownKeys = [KEY]
    const write = (rel: string, text: string): void => {
      assertNoSecret(text, knownKeys)
      const outPath = join(runDir, rel)
      mkdirSync(join(outPath, '..'), { recursive: true })
      writeFileSync(outPath, text, 'utf8')
    }

    // Hash các system prompt **đã gửi thật**, đọc từ request. Bản trước băm prompt MVP của provider
    // trong khi request mang prompt của lõi dịch, nên hash trong config không khớp thứ đã chạy.
    const systemHashes = new Set<string>()
    const commit = gitCommit()
    const startedAt = new Date().toISOString()

    let replaced = 0
    let sentParams: Record<string, unknown> | null = null

    const dataDir = mkdtempSync(join(tmpdir(), 'mira-bench-'))
    const library = LibraryStore.open({ dataDir })
    const httpCodes: number[] = []

    const counting = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body) as {
          messages?: Array<{ role: string; content: unknown }>
        }
        const system = body.messages?.[0]
        if (sentParams === null && system?.role === 'system') {
          sentParams = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'messages'))
        }
        if (PROMPT !== null && system?.role === 'system') {
          system.content = PROMPT
          replaced++
          init = { ...init, body: JSON.stringify(body) }
        }
        if (system?.role === 'system' && typeof system.content === 'string') {
          systemHashes.add(createHash('sha256').update(system.content).digest('hex'))
        }
      }
      const response = await fetch(input, init)
      httpCodes.push(response.status)
      return response
    }) as typeof fetch

    const services = createServices({
      library, crypto, fetch: counting, promptVersion: PROMPT_VERSION
    })
    const connection = services.connections.create({
      name: 'Bộ đo',
      baseUrl: BASE_URL,
      providerId: 'google'
    })
    await services.connections.addApiKey(connection.id, KEY)
    const entryId = services.connections.addModels(connection.id, [
      { model: MODEL, name: 'bench' }
    ]).models[0]!.id

    services.connections.updateEntry(entryId, {
      settings: THINKING === '' ? { rpmLimit: RPM } : { rpmLimit: RPM, thinking: THINKING as any }
    })

    const totalUsage: Record<string, number> = { inputTokens: 0, outputTokens: 0 }
    const allResults: Record<string, Array<{ chapter: string; repeat: number; score: unknown; elapsed: number }>> = {}
    const reportRows: Array<{
      work: string
      chapter: string
      rep: number
      srcParas: number
      tgtParas: number
      structureOk: boolean
      residualChars: number
      strictGloss: string
      forbidden: number
      timeSec: string
    }> = []

    try {
      for (const fixture of works) {
        const workId = getWorkId(fixture.work)
        allResults[workId] = []
        const normGlossary = normalizeGlossaryEntries(fixture.glossary)

        for (const chapter of fixture.chapters) {
          const srcParas = extractParagraphs(chapter.sourceText)
          const normAssertions = normalizeAssertionRules(chapter.assertions)

          for (let rep = 1; rep <= REPEATS; rep++) {
            const start = Date.now()
            let translation = ''
            const callsBefore = httpCodes.length

            // Work setup in temp library
            const workRecord = library.create({
              title: fixture.work.title ?? workId,
              sourceLang: fixture.work.lang
            })
            const { chapter: chapterRecord } = library.createChapter(workRecord.id, chapter.id)
            const normalized = normalizeRaw(chapter.sourceText).text
            const raw = segment(normalized, fixture.work.lang)
            library.saveText(workRecord.id, chapterRecord.id, 'source', normalized, 0, raw)

            // Execute translation through app pipeline
            const plan = services.translator.plan({
              workId: workRecord.id,
              chapterId: chapterRecord.id,
              connectionId: connection.id,
              entryId
            })

            let currentRev = plan.targetRev
            const delay = Math.max(100, Math.ceil(60_000 / Math.max(1, RPM)))

            for (const batch of plan.batches) {
              const result = await services.translator.runBatch({
                workId: workRecord.id,
                chapterId: chapterRecord.id,
                connectionId: connection.id,
                entryId,
                settingsKey: plan.settingsKey,
                sourceIds: batch.sourceIds,
                expectedRev: currentRev
              })
              currentRev = result.targetRev
              if (result.usage) {
                for (const [k, v] of Object.entries(result.usage)) {
                  if (typeof v === 'number') totalUsage[k] = (totalUsage[k] || 0) + v
                }
              }

              // Retry failed segments once
              if (result.failed.length > 0) {
                const retryResult = await services.translator.runBatch({
                  workId: workRecord.id,
                  chapterId: chapterRecord.id,
                  connectionId: connection.id,
                  entryId,
                  settingsKey: plan.settingsKey,
                  sourceIds: result.failed,
                  expectedRev: currentRev
                })
                currentRev = retryResult.targetRev
                if (retryResult.usage) {
                  for (const [k, v] of Object.entries(retryResult.usage)) {
                    if (typeof v === 'number') totalUsage[k] = (totalUsage[k] || 0) + v
                  }
                }
              }

              await sleep(delay)
            }

            const chapterText = library.readText(workRecord.id, chapterRecord.id, 'target')
            translation = chapterText.content
            const tgtParas = extractParagraphs(translation)
            const elapsed = Date.now() - start

            // Run T0 deterministic checks
            const beads = alignParagraphs(srcParas, tgtParas, {
              sourceLang: fixture.work.lang,
              glossary: normGlossary.entries
            })
            const structure = checkStructure(srcParas.length, tgtParas.length, beads)
            const residual = checkResidualSourceChars(srcParas, tgtParas, beads)
            const quotes = checkUnbalancedQuotes(tgtParas)
            const style = classifyDialogueStyle(tgtParas)
            const outliers = checkLengthOutliers(srcParas, tgtParas, beads, {
              sourceLang: fixture.work.lang
            })
            const loops = checkRepetitions(tgtParas)
            const glossaryComp = checkGlossaryCompliance(
              srcParas,
              tgtParas,
              beads,
              normGlossary.entries,
              { sourceLang: fixture.work.lang }
            )
            const assertionsEval = evaluateAssertions(
              srcParas,
              tgtParas,
              beads,
              normAssertions.rules
            )

            const score = {
              structure,
              residualChars: residual,
              unbalancedQuotes: quotes,
              dialogueStyle: style,
              lengthOutliers: outliers,
              loops,
              glossary: glossaryComp,
              assertions: assertionsEval
            }

            // Write translation and score
            const repDir = join(workId, `ch${chapter.id}_r${rep}`)
            write(join(repDir, 'translation.txt'), translation)
            write(
              join(repDir, 'result.json'),
              JSON.stringify(
                {
                  chapter: chapter.id,
                  repeat: rep,
                  score,
                  elapsed,
                  httpCalls: httpCodes.length - callsBefore
                },
                null,
                2
              )
            )

            allResults[workId].push({
              chapter: chapter.id,
              repeat: rep,
              score,
              elapsed
            })

            reportRows.push({
              work: workId,
              chapter: chapter.id,
              rep,
              srcParas: srcParas.length,
              tgtParas: tgtParas.length,
              structureOk: structure.isPerfectMatch,
              residualChars: residual.reduce((acc, r) => acc + r.chars.length, 0),
              strictGloss: `${glossaryComp.strictHits}/${glossaryComp.totalChecks}`,
              forbidden: glossaryComp.forbiddenHits,
              timeSec: (elapsed / 1000).toFixed(1)
            })
          }
        }
      }
    } finally {
      library.close()
      rmSync(dataDir, { recursive: true, force: true })
    }

    if (PROMPT_FILE && replaced === 0) {
      throw new Error(`Tệp prompt ${PROMPT_FILE} đã khai nhưng không có yêu cầu dịch nào được thay thế.`)
    }

    const finishedAt = new Date().toISOString()

    // Config record per spec measure-runs R3
    const config = {
      commitHash: commit,
      model: MODEL,
      sentParams: sentParams ?? {},
      promptVersion: PROMPT_VERSION,
      // Một hash khi mọi request cùng system prompt; nhiều hash khi prompt có tầng đổi theo lô (v1).
      promptHash: [...systemHashes].sort().join(',') || '(none)',
      systemPromptCount: systemHashes.size,
      promptFile: PROMPT_FILE || '(default)',
      thinkingMode: THINKING || 'default',
      temperature: (sentParams as Record<string, unknown> | null)?.['temperature'] ?? null,
      maxTokens: (sentParams as Record<string, unknown> | null)?.['max_tokens'] ?? null,
      repeats: REPEATS,
      works: works.map((w) => ({
        id: getWorkId(w.work),
        chapters: w.chapters.map((c) => c.id)
      })),
      glossaryStatus: works.map((w) => {
        const norm = normalizeGlossaryEntries(w.glossary)
        return {
          workId: getWorkId(w.work),
          status: norm.status,
          totalEntries: norm.entries.length,
          decisionCount: norm.entries.filter((e) => e.decision === true).length
        }
      }),
      startedAt,
      finishedAt,
      usage: totalUsage
    }

    write('config.json', JSON.stringify(config, null, 2))
    write('report.json', JSON.stringify(allResults, null, 2))

    // Build markdown report without story text (R6)
    const mdLines: string[] = [
      `# Translation Run: ${LABEL}`,
      '',
      `- **Model:** ${config.model}`,
      `- **Prompt:** ${config.promptFile}, ${config.promptVersion} (${config.systemPromptCount} system prompt)`,
      `- **Thinking:** ${config.thinkingMode}`,
      `- **Repeats:** ${config.repeats}`,
      `- **Commit:** ${config.commitHash}`,
      `- **Started:** ${config.startedAt}`,
      `- **Finished:** ${config.finishedAt}`,
      '',
      '| Work | Ch | Rep | Src¶ | Tgt¶ | Match | Residual | Gloss | Forbidden | Time |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    ]

    for (const r of reportRows) {
      mdLines.push(
        `| ${r.work} | ${r.chapter} | ${r.rep} | ${r.srcParas} | ${r.tgtParas} | ${r.structureOk ? '✓' : '✗'} | ${r.residualChars} | ${r.strictGloss} | ${r.forbidden} | ${r.timeSec}s |`
      )
    }

    write('report.md', mdLines.join('\n') + '\n')
  })
})
