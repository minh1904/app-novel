/**
 * LLM Judge (T1) pairwise blind comparison runner (spec translation-judging).
 * Compares two runs paragraph-by-paragraph in both directions (A/B and B/A).
 * Uses an independent OpenAI-compatible development adapter, enforces a
 * different model family, and records usage. This is not the app runtime path.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import { loadFixtures } from './fixtures'
import { extractParagraphs } from '../../src/shared/algorithms/fixtureCheck'
import { alignParagraphs } from '../../src/shared/algorithms/paragraphAlign'
import { checkJudgeFamily } from '../../src/shared/algorithms/modelFamily'
import {
  parseJudgeResponse,
  evaluateTwoPassVerdicts,
  type JudgeOutput
} from '../../src/shared/algorithms/judgeParser'
import { assertNoSecret } from '../../src/shared/algorithms/secretGuard'
import { getWorkId } from '../../src/shared/contracts/fixture'

const ROOT = process.cwd()
const RUNS = join(ROOT, 'fixtures', 'private', 'runs')

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

const JUDGE_KEY = env('MIRA_JUDGE_KEY')
const JUDGE_BASE_URL = env(
  'MIRA_JUDGE_BASE_URL',
  'https://openrouter.ai/api/v1'
)
const JUDGE_MODEL = env('MIRA_JUDGE_MODEL', 'anthropic/claude-3.5-sonnet')
const ALLOW_SAME_FAMILY = env('MIRA_JUDGE_ALLOW_SAME_FAMILY') === 'true'

const RUN_A_ID = env('MIRA_RUN_A')
const RUN_B_ID = env('MIRA_RUN_B')

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.min(30_000, Math.max(0, seconds * 1_000))

    const at = Date.parse(retryAfter)
    if (!Number.isNaN(at)) return Math.min(30_000, Math.max(0, at - Date.now()))
  }
  return Math.min(4_000, 500 * 2 ** attempt)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}



describe('Bộ đo — Giám khảo LLM (T1)', () => {
  it(
    'thực hiện so cặp mù hai chiều hoặc bỏ qua an toàn khi thiếu cấu hình',
    { timeout: 600_000 },
    async () => {
    if (!JUDGE_KEY) {
      console.log('MIRA_JUDGE_KEY không có: bỏ qua T1 (không thất bại).')
      return
    }

    if (!RUN_A_ID || !RUN_B_ID) {
      console.log('Cần khai báo MIRA_RUN_A và MIRA_RUN_B để chạy giám khảo.')
      return
    }

    const dirA = join(RUNS, RUN_A_ID)
    const dirB = join(RUNS, RUN_B_ID)

    if (!existsSync(dirA) || !existsSync(dirB)) {
      throw new Error(`Thư mục chạy không tồn tại: ${dirA} hoặc ${dirB}`)
    }

    const configA = JSON.parse(readFileSync(join(dirA, 'config.json'), 'utf8'))
    const configB = JSON.parse(readFileSync(join(dirB, 'config.json'), 'utf8'))

    // Family check (R3)
    const familyCheck = checkJudgeFamily(
      JUDGE_MODEL,
      [configA.model, configB.model],
      { allowSameFamily: ALLOW_SAME_FAMILY }
    )

    if (!familyCheck.valid) {
      throw new Error(familyCheck.reason)
    }

    const isAATest = configA.label === configB.label || RUN_A_ID === RUN_B_ID
    const promptPath = join(ROOT, 'scripts', 'bench', 'prompts', 'judge.txt')
    const judgePromptTemplate = readFileSync(promptPath, 'utf8')
    const judgePromptHash = createHash('sha256').update(judgePromptTemplate).digest('hex')

    const { works } = loadFixtures()
    const workMap = new Map(works.map((w) => [getWorkId(w.work), w]))

    const judgeUsage = { inputTokens: 0, outputTokens: 0 }
    let totalComparedParas = 0
    let aWins = 0
    let bWins = 0
    let ties = 0
    let inconsistentCount = 0
    let oneSidedOmissions = 0
    let unparseableChapters = 0
    const paragraphResults: Array<{
      chapter: string
      sourceIndex: number
      verdict: 'A' | 'B' | 'tie'
      isInconsistent: boolean
    }> = []

    // One retry for invalid output; each HTTP request has bounded transient retries.
    async function queryJudge(promptContent: string): Promise<JudgeOutput | null> {
      for (let formatAttempt = 0; formatAttempt < 2; formatAttempt++) {
        let resp: Response | undefined
        for (let httpAttempt = 0; httpAttempt < 3; httpAttempt++) {
          resp = await fetch(`${JUDGE_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${JUDGE_KEY}`
            },
            body: JSON.stringify({
              model: JUDGE_MODEL,
              messages: [
                { role: 'system', content: judgePromptTemplate },
                { role: 'user', content: promptContent }
              ],
              temperature: 0.1
            })
          })

          const transient = resp.status === 429 || resp.status >= 500
          if (resp.ok || !transient || httpAttempt === 2) break
          await wait(retryDelayMs(resp, httpAttempt))
        }

        if (!resp?.ok) throw new Error(`Judge HTTP error: ${resp?.status ?? 'no-response'}`)

        const data = await resp.json()
        if (data.usage) {
          judgeUsage.inputTokens += data.usage.prompt_tokens || 0
          judgeUsage.outputTokens += data.usage.completion_tokens || 0
        }

        const raw = data.choices?.[0]?.message?.content || ''
        const parsed = parseJudgeResponse(raw)
        if (parsed !== null) return parsed
      }
      return null
    }

    // Process chapters common to both runs
    for (const [workId, fixture] of workMap.entries()) {
      const workDirA = join(dirA, workId)
      const workDirB = join(dirB, workId)
      if (!existsSync(workDirA) || !existsSync(workDirB)) continue

      for (const chapter of fixture.chapters) {
        // Read translation A rep 1 and B rep 1 (or matching rep)
        const pathA = existsSync(join(workDirA, chapter.id, 'rep-1.vi.txt'))
          ? join(workDirA, chapter.id, 'rep-1.vi.txt')
          : join(workDirA, `ch${chapter.id}_r1`, 'translation.txt')
        const pathB = existsSync(join(workDirB, chapter.id, 'rep-1.vi.txt'))
          ? join(workDirB, chapter.id, 'rep-1.vi.txt')
          : join(workDirB, `ch${chapter.id}_r1`, 'translation.txt')

        if (!existsSync(pathA) || !existsSync(pathB)) continue

        const srcParas = extractParagraphs(chapter.sourceText)
        const tgtParasA = extractParagraphs(readFileSync(pathA, 'utf8'))
        const tgtParasB = extractParagraphs(readFileSync(pathB, 'utf8'))

        const beadsA = alignParagraphs(srcParas, tgtParasA, { sourceLang: fixture.work.lang })
        const beadsB = alignParagraphs(srcParas, tgtParasB, { sourceLang: fixture.work.lang })

        // Find common paragraphs (present on both sides)
        const commonPairs: Array<{
          n: number
          sourceIndex: number
          srcText: string
          textA: string
          textB: string
        }> = []

        for (let sIdx = 0; sIdx < srcParas.length; sIdx++) {
          const bA = beadsA.find((b) => b.srcIdx.includes(sIdx))
          const bB = beadsB.find((b) => b.srcIdx.includes(sIdx))

          if (!bA || bA.tgtIdx.length === 0 || !bB || bB.tgtIdx.length === 0) {
            oneSidedOmissions++
            continue
          }

          const textA = bA.tgtIdx.map((i) => tgtParasA[i] ?? '').join(' ')
          const textB = bB.tgtIdx.map((i) => tgtParasB[i] ?? '').join(' ')

          commonPairs.push({
            n: commonPairs.length + 1,
            sourceIndex: sIdx,
            srcText: srcParas[sIdx],
            textA,
            textB
          })
        }

        if (commonPairs.length === 0) continue

        // Build Pass 1 prompt (Candidate A = A, Candidate B = B)
        const pass1User = [
          `# Chapter Source Text:\n${chapter.sourceText}\n`,
          '# Pairs to evaluate:'
        ]
        for (const p of commonPairs) {
          pass1User.push(`[${p.n}]\nSource: ${p.srcText}\nCandidate A: ${p.textA}\nCandidate B: ${p.textB}\n`)
        }

        // Build Pass 2 prompt (SWAPPED: Candidate A = B, Candidate B = A)
        const pass2User = [
          `# Chapter Source Text:\n${chapter.sourceText}\n`,
          '# Pairs to evaluate:'
        ]
        for (const p of commonPairs) {
          pass2User.push(`[${p.n}]\nSource: ${p.srcText}\nCandidate A: ${p.textB}\nCandidate B: ${p.textA}\n`)
        }

        const outPass1 = await queryJudge(pass1User.join('\n'))
        const outPass2 = await queryJudge(pass2User.join('\n'))

        if (!outPass1 || !outPass2) {
          unparseableChapters++
          continue
        }

        const v1Map = new Map(outPass1.paragraphs.map((p) => [p.n, p.verdict]))
        const v2Map = new Map(outPass2.paragraphs.map((p) => [p.n, p.verdict]))

        for (const p of commonPairs) {
          const v1 = v1Map.get(p.n) || 'tie'
          const v2 = v2Map.get(p.n) || 'tie'

          const evaluated = evaluateTwoPassVerdicts(v1, v2)
          paragraphResults.push({
            chapter: `${workId}/${chapter.id}`,
            sourceIndex: p.sourceIndex,
            verdict: evaluated.consistentVerdict,
            isInconsistent: evaluated.isInconsistent
          })
          totalComparedParas++
          if (evaluated.isInconsistent) {
            inconsistentCount++
            ties++
          } else if (evaluated.consistentVerdict === 'A') {
            aWins++
          } else if (evaluated.consistentVerdict === 'B') {
            bWins++
          } else {
            ties++
          }
        }
      }
    }

    const nonTieTotal = aWins + bWins
    const winRateA = nonTieTotal > 0 ? (aWins / nonTieTotal) * 100 : 50
    const inconsistentRate = totalComparedParas > 0 ? (inconsistentCount / totalComparedParas) * 100 : 0

    const judgeResult = {
      judgeModel: JUDGE_MODEL,
      judgeFamily: familyCheck.judgeFamily,
      judgePromptHash,
      runA: RUN_A_ID,
      runB: RUN_B_ID,
      isAATest,
      label: isAATest ? 'A/A (mức nhiễu)' : 'A/B',
      stats: {
        totalComparedParas,
        aWins,
        bWins,
        ties,
        inconsistentCount,
        inconsistentRate: inconsistentRate.toFixed(1) + '%',
        winRateA: winRateA.toFixed(1) + '%',
        oneSidedOmissions,
        unparseableChapters
      },
      paragraphs: paragraphResults,
      usage: judgeUsage
    }

    const outJson = JSON.stringify(judgeResult, null, 2)
    assertNoSecret(outJson, [JUDGE_KEY])

    const outName = `judge-${RUN_A_ID}-vs-${RUN_B_ID}.json`
    writeFileSync(join(RUNS, outName), outJson, 'utf8')

    const mdReport = [
      `# LLM Judge (T1): ${RUN_A_ID} vs ${RUN_B_ID}`,
      '',
      `- **Judge Model:** ${JUDGE_MODEL} (họ: ${familyCheck.judgeFamily})`,
      `- **Type:** ${judgeResult.label}`,
      `- **Prompt Hash:** ${judgePromptHash.slice(0, 16)}`,
      `- **Total Pairs Compared:** ${totalComparedParas}`,
      `- **Run A Wins:** ${aWins} (${winRateA.toFixed(1)}% không tính hòa)`,
      `- **Run B Wins:** ${bWins}`,
      `- **Ties:** ${ties}`,
      `- **Inconsistent Order Rate:** ${inconsistentRate.toFixed(1)}%`,
      `- **One-Sided Omissions:** ${oneSidedOmissions}`,
      `- **Tokens Used:** ${judgeUsage.inputTokens} in / ${judgeUsage.outputTokens} out`
    ].join('\n')

    assertNoSecret(mdReport, [JUDGE_KEY])
    writeFileSync(join(RUNS, `report-judge-${RUN_A_ID}-vs-${RUN_B_ID}.md`), mdReport, 'utf8')
  })
})
