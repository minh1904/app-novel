/**
 * Comparison runner for measurement runs (spec measure-runs).
 * Raw metrics are the default output. The historical E6 rule is available only
 * as an explicitly selected advisory profile; it is not a product decision.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import { evaluateE6Decision, type T0Metrics } from '../../src/shared/algorithms/decisionE6'
import { assertNoSecret } from '../../src/shared/algorithms/secretGuard'

const ROOT = process.cwd()
const RUNS = join(ROOT, 'fixtures', 'private', 'runs')

function env(name: string, fallback = ''): string {
  return process.env[name] || fallback
}

const BASELINE_ID = env('MIRA_RUN_BASELINE', env('MIRA_RUN_A'))
const CANDIDATE_ID = env('MIRA_RUN_CANDIDATE', env('MIRA_RUN_B'))
const DECISION_PROFILE = env('MIRA_BENCH_DECISION_PROFILE')

function extractT0FromRun(runDir: string, chapters: string[]): T0Metrics {
  let omissions = 0
  let additions = 0
  let merges = 0
  let splits = 0
  let totalGloss = 0
  let strictGloss = 0

  const rescorePath = join(runDir, 'rescore.json')
  if (existsSync(rescorePath)) {
    try {
      const rescoreData = JSON.parse(readFileSync(rescorePath, 'utf8'))
      const results = rescoreData.results || {}
      for (const chKey of chapters) {
        const [workId, chId] = chKey.split('/')
        const chList = results[workId] || []
        for (const item of chList) {
          if (item.chapter !== chId) continue
          const score = item.score
          if (score?.structure?.beadCounts) {
            omissions += score.structure.beadCounts['1-0'] || 0
            additions += score.structure.beadCounts['0-1'] || 0
            merges += score.structure.beadCounts['2-1'] || 0
            splits += score.structure.beadCounts['1-2'] || 0
          }
          if (score?.glossary) {
            totalGloss += score.glossary.totalChecks || 0
            strictGloss += score.glossary.strictHits || 0
          }
        }
      }
      const strictRate = totalGloss > 0 ? (strictGloss / totalGloss) * 100 : 100
      return {
        omissions,
        additions,
        merges,
        splits,
        strictGlossaryRate: strictRate
      }
    } catch {}
  }

  for (const chKey of chapters) {
    const [workId, chId] = chKey.split('/')
    const workDir = join(runDir, workId)
    if (!existsSync(workDir)) continue

    // Find all repeats
    for (let rep = 1; rep <= 10; rep++) {
      let resPath = ''
      const pathA = join(workDir, chId, `rep-${rep}.rescore.json`)
      const pathB = join(workDir, chId, `rep-${rep}.json`)
      const pathC = join(workDir, `ch${chId}_r${rep}`, 'result.json')

      if (existsSync(pathA)) resPath = pathA
      else if (existsSync(pathC)) resPath = pathC
      else if (existsSync(pathB)) resPath = pathB
      else break

      try {
        const data = JSON.parse(readFileSync(resPath, 'utf8'))
        const score = data.score ?? data
        if (score.structure?.beadCounts) {
          omissions += score.structure.beadCounts['1-0'] || 0
          additions += score.structure.beadCounts['0-1'] || 0
          merges += score.structure.beadCounts['2-1'] || 0
          splits += score.structure.beadCounts['1-2'] || 0
        }
        if (score.glossary) {
          totalGloss += score.glossary.totalChecks || 0
          strictGloss += score.glossary.strictHits || 0
        }
      } catch {}
    }
  }

  const strictRate = totalGloss > 0 ? (strictGloss / totalGloss) * 100 : 100
  return {
    omissions,
    additions,
    merges,
    splits,
    strictGlossaryRate: strictRate
  }
}

describe('Bộ đo — So sánh hai lần chạy', () => {
  it('báo metrics trên chương chung và chỉ áp policy được chọn rõ', () => {
    if (!BASELINE_ID || !CANDIDATE_ID) {
      console.log('Cần khai báo MIRA_RUN_BASELINE và MIRA_RUN_CANDIDATE để so sánh.')
      return
    }

    if (DECISION_PROFILE && DECISION_PROFILE !== 'legacy-e6') {
      throw new Error(`Decision profile không được hỗ trợ: ${DECISION_PROFILE}`)
    }

    const dirBase = join(RUNS, BASELINE_ID)
    const dirCand = join(RUNS, CANDIDATE_ID)

    if (!existsSync(dirBase) || !existsSync(dirCand)) {
      throw new Error(`Thư mục chạy không tồn tại: ${dirBase} hoặc ${dirCand}`)
    }

    // Find chapters present in both runs
    const chaptersBase = new Set<string>()
    const chaptersCand = new Set<string>()

    for (const work of readdirSync(dirBase)) {
      const wDir = join(dirBase, work)
      if (!existsSync(wDir) || !statSync(wDir).isDirectory()) continue
      for (const ch of readdirSync(wDir)) {
        const chPath = join(wDir, ch)
        if (!statSync(chPath).isDirectory()) continue
        if (existsSync(join(chPath, 'rep-1.vi.txt')) || existsSync(join(chPath, 'translation.txt'))) {
          const chId = ch.startsWith('ch') ? ch.slice(2).split('_')[0] : ch
          chaptersBase.add(`${work}/${chId}`)
        }
      }
    }

    for (const work of readdirSync(dirCand)) {
      const wDir = join(dirCand, work)
      if (!existsSync(wDir) || !statSync(wDir).isDirectory()) continue
      for (const ch of readdirSync(wDir)) {
        const chPath = join(wDir, ch)
        if (!statSync(chPath).isDirectory()) continue
        if (existsSync(join(chPath, 'rep-1.vi.txt')) || existsSync(join(chPath, 'translation.txt'))) {
          const chId = ch.startsWith('ch') ? ch.slice(2).split('_')[0] : ch
          chaptersCand.add(`${work}/${chId}`)
        }
      }
    }

    const commonChapters = Array.from(chaptersBase).filter((c) => chaptersCand.has(c))
    if (commonChapters.length === 0) {
      throw new Error('Hai lần chạy không có chương chung nào: từ chối so sánh.')
    }

    const baseT0 = extractT0FromRun(dirBase, commonChapters)
    const candT0 = extractT0FromRun(dirCand, commonChapters)

    // Check if T1 judge file exists
    let judgeData: any = null
    const judgeFile1 = join(RUNS, `judge-${BASELINE_ID}-vs-${CANDIDATE_ID}.json`)
    const judgeFile2 = join(RUNS, `judge-${CANDIDATE_ID}-vs-${BASELINE_ID}.json`)

    if (existsSync(judgeFile1)) {
      judgeData = JSON.parse(readFileSync(judgeFile1, 'utf8'))
    } else if (existsSync(judgeFile2)) {
      judgeData = JSON.parse(readFileSync(judgeFile2, 'utf8'))
    }

    let humanData: any = null
    const humanFile1 = join(RUNS, `human-${BASELINE_ID}-vs-${CANDIDATE_ID}.json`)
    const humanFile2 = join(RUNS, `human-${CANDIDATE_ID}-vs-${BASELINE_ID}.json`)
    if (existsSync(humanFile1)) {
      humanData = JSON.parse(readFileSync(humanFile1, 'utf8'))
    } else if (existsSync(humanFile2)) {
      humanData = JSON.parse(readFileSync(humanFile2, 'utf8'))
    }

    let winRateCI: any = undefined
    let nonTieCount: number | undefined = undefined

    if (judgeData) {
      nonTieCount = judgeData.stats?.aWins + judgeData.stats?.bWins
      const rawCI = judgeData.stats?.winRateCI
      if (
        rawCI &&
        [rawCI.mean, rawCI.lower, rawCI.upper].every((value) => typeof value === 'number')
      ) {
        if (judgeData.runA === CANDIDATE_ID) {
          winRateCI = rawCI
        } else {
          // Stored CI is for run A; mirror it when the candidate is run B.
          winRateCI = {
            mean: 1 - rawCI.mean,
            lower: 1 - rawCI.upper,
            upper: 1 - rawCI.lower
          }
        }
      }
    }

    const advisory = DECISION_PROFILE === 'legacy-e6'
      ? evaluateE6Decision({
          baselineT0: baseT0,
          candidateT0: candT0,
          winRateCI,
          nonTieCount
        })
      : null

    const baselineStructureIssues =
      baseT0.omissions + baseT0.additions + baseT0.merges + baseT0.splits
    const candidateStructureIssues =
      candT0.omissions + candT0.additions + candT0.merges + candT0.splits
    const strictGlossaryDiff = candT0.strictGlossaryRate - baseT0.strictGlossaryRate

    const decisionLabels: Record<string, string> = {
      keep: 'GIỮ (keep)',
      'no-keep': 'KHÔNG GIỮ (no-keep)',
      insufficient: 'CHƯA ĐỦ DỮ LIỆU (insufficient)'
    }

    const reportLines = [
      `# Measurement comparison: ${CANDIDATE_ID} vs ${BASELINE_ID}`,
      '',
      `- **Decision profile:** ${DECISION_PROFILE || 'none (metrics only)'}`,
      `- **Số chương chung:** ${commonChapters.length}`,
      '',
      '## Số liệu kiểm tất định T0 (trên các chương chung):',
      `| Chỉ số | Baseline (${BASELINE_ID}) | Candidate (${CANDIDATE_ID}) | Chênh lệch |`,
      '| --- | --- | --- | --- |',
      `| Đoạn sót (1-0) | ${baseT0.omissions} | ${candT0.omissions} | ${candT0.omissions - baseT0.omissions} |`,
      `| Đoạn dư (0-1) | ${baseT0.additions} | ${candT0.additions} | ${candT0.additions - baseT0.additions} |`,
      `| Gộp (2-1) | ${baseT0.merges} | ${candT0.merges} | ${candT0.merges - baseT0.merges} |`,
      `| Tách (1-2) | ${baseT0.splits} | ${candT0.splits} | ${candT0.splits - baseT0.splits} |`,
      `| Tổng cờ cấu trúc | ${baselineStructureIssues} | ${candidateStructureIssues} | ${candidateStructureIssues - baselineStructureIssues} |`,
      `| Tuân thủ glossary chặt | ${baseT0.strictGlossaryRate.toFixed(1)}% | ${candT0.strictGlossaryRate.toFixed(1)}% | ${strictGlossaryDiff > 0 ? '+' : ''}${strictGlossaryDiff.toFixed(1)}% |`
    ]

    if (advisory) {
      reportLines.push(
        '',
        '## Khuyến nghị legacy-e6 (chỉ để tham khảo)',
        '',
        `- **Nhãn:** **${decisionLabels[advisory.decision]}**`,
        `- **Lý do:** ${advisory.reason}`
      )
    }

    if (judgeData) {
      const candidateWins = judgeData.runB === CANDIDATE_ID
        ? judgeData.stats?.bWins
        : judgeData.stats?.aWins
      const baselineWins = judgeData.runB === CANDIDATE_ID
        ? judgeData.stats?.aWins
        : judgeData.stats?.bWins
      reportLines.push(
        '',
        '## T1 — judge LLM (chưa hiệu chuẩn nếu chưa có A/A và đối chiếu người)',
        '',
        `- Candidate thắng: ${candidateWins ?? 0}`,
        `- Baseline thắng: ${baselineWins ?? 0}`,
        `- Hòa: ${judgeData.stats?.ties ?? 0}`,
        `- Không nhất quán: ${judgeData.stats?.inconsistentCount ?? 0}`,
        `- Sót một phía: ${judgeData.stats?.oneSidedOmissions ?? 0}`
      )
    } else {
      reportLines.push('', '## T1 — chưa có dữ liệu judge')
    }

    if (humanData) {
      const candidateWins = humanData.runB === CANDIDATE_ID ? humanData.bWins : humanData.aWins
      const baselineWins = humanData.runB === CANDIDATE_ID ? humanData.aWins : humanData.bWins
      reportLines.push(
        '',
        '## T3 — người chấm mù',
        '',
        `- Candidate thắng: ${candidateWins ?? 0}`,
        `- Baseline thắng: ${baselineWins ?? 0}`,
        `- Hòa: ${humanData.ties ?? 0}`,
        `- Mẫu có cờ: ${humanData.totalFlagged ?? 0}/${humanData.totalRated ?? 0}`
      )
    } else {
      reportLines.push('', '## T3 — chưa có dữ liệu người chấm')
    }

    const reportText = reportLines.join('\n') + '\n'
    assertNoSecret(reportText)

    const outName = `compare-${BASELINE_ID}-vs-${CANDIDATE_ID}.json`
    writeFileSync(
      join(RUNS, outName),
      JSON.stringify(
        {
          baselineId: BASELINE_ID,
          candidateId: CANDIDATE_ID,
          commonChapters,
          baseT0,
          candT0,
          t1: judgeData,
          t3: humanData,
          decisionProfile: DECISION_PROFILE || null,
          advisory
        },
        null,
        2
      ),
      'utf8'
    )

    writeFileSync(join(RUNS, `report-compare-${BASELINE_ID}-vs-${CANDIDATE_ID}.md`), reportText, 'utf8')
    console.log(reportText)
  })
})
