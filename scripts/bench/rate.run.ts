/**
 * Công cụ đánh giá bởi con người (T3):
 * 1. Chế độ tạo: tạo trang HTML ngoại tuyến độc lập để chấm mù với các ứng viên đã được xáo trộn ngẫu nhiên.
 * 2. Chế độ nhập: đọc kết quả đánh giá, hoàn tác việc xáo trộn, thống kê các phân nhóm có cờ và trường hợp khó
 *    thay vì âm thầm loại bỏ, đồng thời tính toán tỷ lệ thắng, khoảng tin cậy bootstrap và hệ số Cohen's Kappa với T1.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadFixtures } from './fixtures'
import { extractParagraphs } from '../../src/measurement/fixtureCheck'
import { alignParagraphs } from '../../src/shared/translation/paragraphAlign'
import {
  checkGlossaryCompliance,
  checkLengthOutliers,
  checkRepetitions,
  checkResidualSourceChars,
  checkUnbalancedQuotes,
  evaluateAssertions
} from '../../src/shared/translation/translationChecks'
import { createPrng, computeCohenKappa, bootstrapWinRateCI } from '../../src/measurement/statistics'
import { assertNoSecret } from '../../src/measurement/secretGuard'
import {
  getWorkId,
  normalizeAssertionRules,
  normalizeGlossaryEntries,
  type AssertionRule,
  type GlossaryEntry
} from '../../src/shared/contracts/fixture'
import type { SourceLanguage } from '../../src/shared/contracts/library'
import type { Bead } from '../../src/shared/translation/paragraphAlign'

const ROOT = process.cwd()
const RUNS = join(ROOT, 'fixtures', 'private', 'runs')

function env(name: string, fallback = ''): string {
  return process.env[name] || fallback
}

const RUN_A_ID = env('MIRA_RUN_A')
const RUN_B_ID = env('MIRA_RUN_B')
const ANSWERS_FILE = env('MIRA_RATE_ANSWERS')

export type SampleStratum = 'ordinary' | 'glossary' | 'addressing'

export interface SampleItem {
  id: number
  chapter: string
  workId: string
  stratum: SampleStratum
  srcText: string
  candidate1: string
  candidate2: string
}

export interface KeyItem {
  id: number
  chapter: string
  workId: string
  stratum: SampleStratum
  srcText: string
  candidate1IsA: boolean
  flaggedByT0: boolean
  inconsistentT1: boolean
  t1Verdict?: 'A' | 'B' | 'tie'
}

export function buildHtmlPage(sample: SampleItem[], label: string): string {
  const jsonStr = JSON.stringify(sample).replace(/</g, '\\u003c')
  const labelJson = JSON.stringify(label).replace(/</g, '\\u003c')
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đánh giá chất lượng dịch văn học - Mẫu so cặp</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; background: #f9f9fb; color: #111; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; }
  .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .src-box { background: #f1f5f9; padding: 12px; border-radius: 6px; font-weight: 500; margin-bottom: 16px; font-family: serif; }
  .candidates { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .cand-box { padding: 12px; border: 2px solid #e2e8f0; border-radius: 6px; cursor: pointer; }
  .cand-box.selected { border-color: #2563eb; background: #eff6ff; }
  .cand-box h3 { margin-top: 0; font-size: 0.95rem; color: #475569; }
  .choice-row { display: flex; gap: 12px; align-items: center; margin-top: 8px; }
  .btn-tie { padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; }
  .btn-tie.selected { border-color: #2563eb; background: #eff6ff; font-weight: bold; }
  .export-bar { position: sticky; bottom: 10px; background: white; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  button.action-btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
  button.action-btn:hover { background: #1d4ed8; }
</style>
</head>
<body>
  <h1>Đánh giá so cặp ẩn danh (Human Evaluation)</h1>
  <p>Vui lòng đọc văn bản gốc và chọn bản dịch tốt hơn theo ngữ nghĩa, độ mượt mà và tự nhiên của tiếng Việt.</p>
  
  <div id="items-container"></div>

  <div class="export-bar">
    <div id="progress">Đã hoàn thành: 0 / ${sample.length}</div>
    <button class="action-btn" onclick="downloadAnswers()">Xuất kết quả (Tải file JSON)</button>
  </div>

  <script>
    const items = ${jsonStr};
    const storageKey = 'mira_rate_' + ${labelJson};
    let answers = JSON.parse(localStorage.getItem(storageKey) || '{}');

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function updateProgress() {
      const answered = Object.keys(answers).length;
      document.getElementById('progress').innerText = 'Đã hoàn thành: ' + answered + ' / ' + items.length;
    }

    function selectChoice(id, choice) {
      answers[id] = { choice: choice };
      localStorage.setItem(storageKey, JSON.stringify(answers));
      renderItems();
      updateProgress();
    }

    function renderItems() {
      const container = document.getElementById('items-container');
      container.innerHTML = '';
      items.forEach((item, index) => {
        const cur = answers[item.id] ? answers[item.id].choice : null;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = \`
          <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">Đoạn \${index + 1} / \${items.length} (\${escapeHtml(item.chapter)})</div>
          <div class="src-box">\${escapeHtml(item.srcText)}</div>
          <div class="candidates">
            <div class="cand-box \${cur === '1' ? 'selected' : ''}" onclick="selectChoice(\${item.id}, '1')">
              <h3>Bản dịch 1</h3>
              <p>\${escapeHtml(item.candidate1)}</p>
            </div>
            <div class="cand-box \${cur === '2' ? 'selected' : ''}" onclick="selectChoice(\${item.id}, '2')">
              <h3>Bản dịch 2</h3>
              <p>\${escapeHtml(item.candidate2)}</p>
            </div>
          </div>
          <div class="choice-row">
            <button class="btn-tie \${cur === 'tie' ? 'selected' : ''}" onclick="selectChoice(\${item.id}, 'tie')">Ngang nhau / Khó phân biệt</button>
          </div>
        \`;
        container.appendChild(card);
      });
    }

    function downloadAnswers() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(answers, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", "rating-" + ${labelJson} + ".answers.json");
      dlAnchor.click();
    }

    renderItems();
    updateProgress();
  </script>
</body>
</html>`
}

interface RatingCandidate {
  chapter: string
  workId: string
  stratum: SampleStratum
  srcText: string
  textA: string
  textB: string
  flaggedByT0: boolean
  inconsistentT1: boolean
  t1Verdict?: 'A' | 'B' | 'tie'
}

function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

function interleaveChapters(items: RatingCandidate[], rng: () => number): RatingCandidate[] {
  const byChapter = new Map<string, RatingCandidate[]>()
  for (const item of items) {
    const group = byChapter.get(item.chapter) ?? []
    group.push(item)
    byChapter.set(item.chapter, group)
  }

  const chapters = [...byChapter.keys()]
  shuffleInPlace(chapters, rng)
  for (const group of byChapter.values()) shuffleInPlace(group, rng)

  const ordered: RatingCandidate[] = []
  let remaining = items.length
  while (remaining > 0) {
    for (const chapter of chapters) {
      const next = byChapter.get(chapter)?.pop()
      if (!next) continue
      ordered.push(next)
      remaining--
    }
  }
  return ordered
}

function selectStratified(
  pool: RatingCandidate[],
  sampleSize: number,
  rng: () => number
): RatingCandidate[] {
  const strata: SampleStratum[] = ['addressing', 'glossary', 'ordinary']
  const queues = new Map(
    strata.map((stratum) => [
      stratum,
      interleaveChapters(pool.filter((item) => item.stratum === stratum), rng)
    ])
  )
  const cursors = new Map(strata.map((stratum) => [stratum, 0]))
  const selected: RatingCandidate[] = []

  while (selected.length < sampleSize) {
    let progressed = false
    for (const stratum of strata) {
      const queue = queues.get(stratum) ?? []
      const cursor = cursors.get(stratum) ?? 0
      if (cursor >= queue.length) continue
      selected.push(queue[cursor])
      cursors.set(stratum, cursor + 1)
      progressed = true
      if (selected.length === sampleSize) break
    }
    if (!progressed) break
  }

  return selected
}

function paragraphStratum(
  source: string,
  paragraphIndex: number,
  glossaryForms: string[],
  assertionRules: ReturnType<typeof normalizeAssertionRules>['rules']
): SampleStratum {
  const addressing = assertionRules.some((rule) => {
    if (!rule.pair) return false
    if (typeof rule.line === 'number' && rule.line === paragraphIndex + 1) return true
    if (typeof rule.line === 'string' && rule.line.trim() === source.trim()) return true
    return typeof rule.where === 'string' && source.includes(rule.where)
  })
  if (addressing) return 'addressing'

  const folded = source.toLocaleLowerCase()
  if (glossaryForms.some((form) => folded.includes(form.toLocaleLowerCase()))) return 'glossary'
  return 'ordinary'
}

function assertionSourceIndex(rule: AssertionRule, srcParas: string[]): number {
  if (typeof rule.line === 'number') return rule.line - 1
  if (typeof rule.line === 'string') {
    const target = rule.line.trim()
    return srcParas.findIndex((text) => text.trim() === target)
  }
  if (rule.where !== undefined) return srcParas.findIndex((text) => text.includes(rule.where ?? ''))
  return -1
}

function collectT0FlaggedSourceIndexes(
  srcParas: string[],
  tgtParas: string[],
  beads: Bead[],
  sourceLang: SourceLanguage,
  glossary: GlossaryEntry[],
  assertionRules: AssertionRule[]
): Set<number> {
  const flaggedSources = new Set<number>()
  const flaggedTargets = new Set<number>()

  for (const bead of beads) {
    if (bead.type !== '1-1') bead.srcIdx.forEach((index) => flaggedSources.add(index))
  }
  checkResidualSourceChars(srcParas, tgtParas, beads)
    .forEach((issue) => flaggedTargets.add(issue.paragraphIndex))
  checkUnbalancedQuotes(tgtParas).forEach((issue) => flaggedTargets.add(issue.paragraphIndex))
  checkRepetitions(tgtParas).forEach((issue) => flaggedTargets.add(issue.paragraphIndex))
  checkLengthOutliers(srcParas, tgtParas, beads, { sourceLang }).forEach((issue) => {
    beads[issue.beadIndex]?.srcIdx.forEach((index) => flaggedSources.add(index))
  })
  checkGlossaryCompliance(srcParas, tgtParas, beads, glossary, { sourceLang })
    .forbiddenViolations.forEach((issue) => flaggedTargets.add(issue.paragraphIndex))

  evaluateAssertions(srcParas, tgtParas, beads, assertionRules).forEach((evaluation) => {
    if (evaluation.result !== 'fail') return
    const sourceIndex = assertionSourceIndex(assertionRules[evaluation.ruleIndex], srcParas)
    if (sourceIndex >= 0) flaggedSources.add(sourceIndex)
  })

  for (const bead of beads) {
    if (bead.tgtIdx.some((index) => flaggedTargets.has(index))) {
      bead.srcIdx.forEach((index) => flaggedSources.add(index))
    }
  }
  return flaggedSources
}

describe('rate.run.ts', () => {
  it('sinh trang HTML hoặc xử lý nhập kết quả người chấm', () => {
    if (!RUN_A_ID || !RUN_B_ID) {
      console.log('Cần khai báo MIRA_RUN_A và MIRA_RUN_B để chạy rate.run.ts')
      return
    }

    const pairLabel = `${RUN_A_ID}-vs-${RUN_B_ID}`
    const blindLabel = createHash('sha256').update(pairLabel).digest('hex').slice(0, 12)

    // Chế độ 1: Nhập kết quả nếu có ANSWERS_FILE
    if (ANSWERS_FILE && existsSync(ANSWERS_FILE)) {
      const keyPath = join(RUNS, `rating-${pairLabel}.key.json`)
      if (!existsSync(keyPath)) {
        throw new Error(`Không tìm thấy file key: ${keyPath}`)
      }

      const keys = JSON.parse(readFileSync(keyPath, 'utf8')) as KeyItem[]
      const answers = JSON.parse(readFileSync(ANSWERS_FILE, 'utf8')) as Record<
        string,
        { choice: '1' | '2' | 'tie' }
      >

      const chapterStatsMap = new Map<string, { aWins: number; bWins: number }>()
      const subgroupStats = new Map<
        SampleStratum,
        { total: number; aWins: number; bWins: number; ties: number; flagged: number }
      >()
      let totalRated = 0
      let totalFlagged = 0
      let aWinsTotal = 0
      let bWinsTotal = 0
      let tiesTotal = 0

      const humanChoicesForKappa: Array<'A' | 'B' | 'tie'> = []
      const judgeChoicesForKappa: Array<'A' | 'B' | 'tie'> = []

      for (const item of keys) {
        const ans = answers[item.id.toString()]
        if (!ans) continue

        const flagged = item.flaggedByT0 || item.inconsistentT1
        if (flagged) totalFlagged++
        totalRated++
        let winner: 'A' | 'B' | 'tie' = 'tie'
        if (ans.choice === '1') {
          winner = item.candidate1IsA ? 'A' : 'B'
        } else if (ans.choice === '2') {
          winner = item.candidate1IsA ? 'B' : 'A'
        }

        if (winner === 'A') aWinsTotal++
        if (winner === 'B') bWinsTotal++
        if (winner === 'tie') tiesTotal++

        const stat = chapterStatsMap.get(item.chapter) || { aWins: 0, bWins: 0 }
        if (winner === 'A') stat.aWins++
        if (winner === 'B') stat.bWins++
        chapterStatsMap.set(item.chapter, stat)

        const stratum = item.stratum ?? 'ordinary'
        const subgroup = subgroupStats.get(stratum) ?? {
          total: 0,
          aWins: 0,
          bWins: 0,
          ties: 0,
          flagged: 0
        }
        subgroup.total++
        if (winner === 'A') subgroup.aWins++
        if (winner === 'B') subgroup.bWins++
        if (winner === 'tie') subgroup.ties++
        if (flagged) subgroup.flagged++
        subgroupStats.set(stratum, subgroup)

        // So sánh chỉ số Kappa nếu có kết luận của T1
        if (item.t1Verdict && !item.inconsistentT1) {
          humanChoicesForKappa.push(winner)
          judgeChoicesForKappa.push(item.t1Verdict)
        }
      }

      const chapterStats = Array.from(chapterStatsMap.values())
      const ci = bootstrapWinRateCI(chapterStats)
      const decidedTotal = aWinsTotal + bWinsTotal
      const winRateA = decidedTotal > 0 ? (aWinsTotal / decidedTotal) * 100 : 50

      let kappaReport = 'Không có mẫu chung với T1'
      if (humanChoicesForKappa.length > 0) {
        const kappaRes = computeCohenKappa(humanChoicesForKappa, judgeChoicesForKappa)
        const sampleWarning = humanChoicesForKappa.length < 50
          ? '; chưa đủ 50 đoạn để đặt ngưỡng'
          : ''
        kappaReport = `Cohen's Kappa: ${kappaRes.kappa.toFixed(3)} (Tỷ lệ đồng ý: ${(kappaRes.observedAgreement * 100).toFixed(1)}%, n=${humanChoicesForKappa.length}${sampleWarning})`
      }

      const subgroupLines = ([...subgroupStats.entries()] as Array<[
        SampleStratum,
        { total: number; aWins: number; bWins: number; ties: number; flagged: number }
      ]>).map(([stratum, stat]) =>
        `| ${stratum} | ${stat.total} | ${stat.aWins} | ${stat.bWins} | ${stat.ties} | ${stat.flagged} |`
      )

      const report = [
        `# Human Rating (T3): ${pairLabel}`,
        '',
        `- **Tổng đoạn chấm:** ${totalRated}`,
        `- **Đoạn có cờ T0/T1:** ${totalFlagged} (vẫn tính và báo cáo riêng, không loại ngầm)`,
        `- **Thắng bên A:** ${aWinsTotal} (${winRateA.toFixed(1)}%)`,
        `- **Thắng bên B:** ${bWinsTotal}`,
        `- **Ngang:** ${tiesTotal}`,
        `- **Khoảng tin cậy 95% (Bootstrap):** [${(ci.lower * 100).toFixed(1)}%, ${(ci.upper * 100).toFixed(1)}%]`,
        `- **Đồng thuận với Giám khảo LLM (T1):** ${kappaReport}`,
        '',
        '## Phân nhóm mẫu',
        '',
        '| Nhóm | Tổng | A thắng | B thắng | Ngang | Có cờ |',
        '| --- | ---: | ---: | ---: | ---: | ---: |',
        ...subgroupLines
      ].join('\n')

      assertNoSecret(report)
      const resultJson = JSON.stringify(
        {
          runA: RUN_A_ID,
          runB: RUN_B_ID,
          totalRated,
          totalFlagged,
          aWins: aWinsTotal,
          bWins: bWinsTotal,
          ties: tiesTotal,
          winRateA,
          confidenceInterval: ci,
          judgeAgreementSampleSize: humanChoicesForKappa.length,
          subgroups: Object.fromEntries(subgroupStats)
        },
        null,
        2
      )
      assertNoSecret(resultJson)
      writeFileSync(join(RUNS, `human-${pairLabel}.json`), resultJson, 'utf8')
      writeFileSync(join(RUNS, `report-human-${pairLabel}.md`), report, 'utf8')
      console.log(report)
      return
    }

    // Chế độ 2: Tạo trang HTML để chấm
    const dirA = join(RUNS, RUN_A_ID)
    const dirB = join(RUNS, RUN_B_ID)
    const { works } = loadFixtures()

    const judgeByParagraph = new Map<
      string,
      { verdict: 'A' | 'B' | 'tie'; isInconsistent: boolean }
    >()
    const judgePaths = [
      join(RUNS, `judge-${RUN_A_ID}-vs-${RUN_B_ID}.json`),
      join(RUNS, `judge-${RUN_B_ID}-vs-${RUN_A_ID}.json`)
    ]
    const judgePath = judgePaths.find((path) => existsSync(path))
    if (judgePath) {
      const judgeData = JSON.parse(readFileSync(judgePath, 'utf8'))
      for (const item of judgeData.paragraphs ?? []) {
        let verdict = item.verdict as 'A' | 'B' | 'tie'
        if (judgeData.runA !== RUN_A_ID && verdict !== 'tie') {
          verdict = verdict === 'A' ? 'B' : 'A'
        }
        judgeByParagraph.set(`${item.chapter}/${item.sourceIndex}`, {
          verdict,
          isInconsistent: Boolean(item.isInconsistent)
        })
      }
    }

    const rng = createPrng(42)
    const candidatesPool: RatingCandidate[] = []

    for (const fixture of works) {
      const workId = getWorkId(fixture.work)
      const workDirA = join(dirA, workId)
      const workDirB = join(dirB, workId)
      if (!existsSync(workDirA) || !existsSync(workDirB)) continue

      const glossaryEntries = normalizeGlossaryEntries(fixture.glossary).entries
      const glossaryForms = glossaryEntries.flatMap((entry) => [
        entry.src,
        ...(entry.aliases ?? []).map((alias) => typeof alias === 'string' ? alias : alias.src)
      ])

      for (const chapter of fixture.chapters) {
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
        const assertionRules = normalizeAssertionRules(chapter.assertions).rules
        const flaggedA = collectT0FlaggedSourceIndexes(
          srcParas,
          tgtParasA,
          beadsA,
          fixture.work.lang,
          glossaryEntries,
          assertionRules
        )
        const flaggedB = collectT0FlaggedSourceIndexes(
          srcParas,
          tgtParasB,
          beadsB,
          fixture.work.lang,
          glossaryEntries,
          assertionRules
        )

        for (let s = 0; s < srcParas.length; s++) {
          const bA = beadsA.find((b) => b.srcIdx.includes(s))
          const bB = beadsB.find((b) => b.srcIdx.includes(s))

          if (
            bA &&
            bA.type === '1-1' &&
            bB &&
            bB.type === '1-1' &&
            srcParas[s].replace(/[\s\u3000]/g, '').length >= 20
          ) {
            const judge = judgeByParagraph.get(`${workId}/${chapter.id}/${s}`)
            candidatesPool.push({
              chapter: `${workId}/${chapter.id}`,
              workId,
              stratum: paragraphStratum(srcParas[s], s, glossaryForms, assertionRules),
              srcText: srcParas[s],
              textA: tgtParasA[bA.tgtIdx[0]],
              textB: tgtParasB[bB.tgtIdx[0]],
              flaggedByT0: flaggedA.has(s) || flaggedB.has(s),
              inconsistentT1: judge?.isInconsistent ?? false,
              t1Verdict: judge?.isInconsistent ? undefined : judge?.verdict
            })
          }
        }
      }
    }

    // Lấy mẫu tất định, xen kẽ theo chương trên các phân tầng có sẵn.
    const sampleSize = Math.min(candidatesPool.length, 70)
    const selected = selectStratified(candidatesPool, sampleSize, rng)

    const sampleItems: SampleItem[] = []
    const keyItems: KeyItem[] = []

    for (let i = 0; i < selected.length; i++) {
      const item = selected[i]
      const candidate1IsA = rng() > 0.5

      sampleItems.push({
        id: i + 1,
        chapter: item.chapter,
        workId: item.workId,
        stratum: item.stratum,
        srcText: item.srcText,
        candidate1: candidate1IsA ? item.textA : item.textB,
        candidate2: candidate1IsA ? item.textB : item.textA
      })

      keyItems.push({
        id: i + 1,
        chapter: item.chapter,
        workId: item.workId,
        stratum: item.stratum,
        srcText: item.srcText,
        candidate1IsA,
        flaggedByT0: item.flaggedByT0,
        inconsistentT1: item.inconsistentT1,
        t1Verdict: item.t1Verdict
      })
    }

    const htmlContent = buildHtmlPage(sampleItems, blindLabel)
    assertNoSecret(htmlContent)

    // Kiểm tra xác thực: không để lộ nhãn điều kiện trong HTML
    expect(htmlContent.includes(RUN_A_ID)).toBe(false)
    expect(htmlContent.includes(RUN_B_ID)).toBe(false)

    writeFileSync(join(RUNS, `rating-${blindLabel}.html`), htmlContent, 'utf8')
    writeFileSync(join(RUNS, `rating-${pairLabel}.key.json`), JSON.stringify(keyItems, null, 2), 'utf8')
    console.log(`Đã tạo trang chấm mù: rating-${blindLabel}.html`)
  })
})
