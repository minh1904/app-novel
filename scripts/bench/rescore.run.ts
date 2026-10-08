/**
 * Re-scores a saved measurement run using current T0 deterministic checks without calling API.
 * Preserves original usage, elapsed time, and errors.
 * Writes rescore.json and report-rescore.md alongside the original report.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadFixtures } from './fixtures'
import { extractParagraphs } from '../../src/measurement/fixtureCheck'
import { alignParagraphs } from '../../src/shared/translation/paragraphAlign'
import {
  checkStructure,
  checkResidualSourceChars,
  checkUnbalancedQuotes,
  classifyDialogueStyle,
  checkLengthOutliers,
  checkRepetitions,
  checkGlossaryCompliance,
  evaluateAssertions
} from '../../src/shared/translation/translationChecks'
import { assertNoSecret } from '../../src/measurement/secretGuard'
import { getWorkId, normalizeGlossaryEntries, normalizeAssertionRules } from '../../src/shared/contracts/fixture'

const ROOT = process.cwd()
const RUNS = join(ROOT, 'fixtures', 'private', 'runs')

function pickRun(): string | null {
  if (process.env.MIRA_BENCH_RUN) return process.env.MIRA_BENCH_RUN
  if (!existsSync(RUNS)) return null
  const done = readdirSync(RUNS)
    .filter((name) => existsSync(join(RUNS, name, 'report.json')) || existsSync(join(RUNS, name, 'config.json')))
    .sort()
  return done.at(-1) ?? null
}

const RUN = pickRun()

describe.skipIf(RUN === null)(`Bộ đo — chấm lại lượt ${RUN}`, () => {
  it('chấm lại mọi bản dịch đã lưu mà không gọi API', () => {
    // Safety: ensure fetch is NOT called during rescoring
    const originalFetch = globalThis.fetch
    globalThis.fetch = (() => {
      throw new Error('rescore không được phép gọi mạng!')
    }) as typeof fetch

    try {
      const runDir = join(RUNS, RUN!)
      const { works } = loadFixtures()
      const workMap = new Map(works.map((w) => [getWorkId(w.work), w]))

      const rescoreResults: Record<string, any[]> = {}
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

      for (const [workId, fixture] of workMap.entries()) {
        const workRunDir = join(runDir, workId)
        if (!existsSync(workRunDir)) continue

        rescoreResults[workId] = []
        const normGlossary = normalizeGlossaryEntries(fixture.glossary)

        for (const chapter of fixture.chapters) {
          const srcParas = extractParagraphs(chapter.sourceText)
          const normAssertions = normalizeAssertionRules(chapter.assertions)

          // Find repeats in either layout:
          // Layout A: workRunDir/<chapter>/rep-<rep>.vi.txt
          // Layout B: workRunDir/ch<chapter>_r<rep>/translation.txt
          let rep = 1
          while (true) {
            let translationPath = ''
            let resultPath = ''

            const pathA_txt = join(workRunDir, chapter.id, `rep-${rep}.vi.txt`)
            const pathA_json = join(workRunDir, chapter.id, `rep-${rep}.json`)
            const pathB_txt = join(workRunDir, `ch${chapter.id}_r${rep}`, 'translation.txt')
            const pathB_json = join(workRunDir, `ch${chapter.id}_r${rep}`, 'result.json')

            if (existsSync(pathA_txt)) {
              translationPath = pathA_txt
              resultPath = pathA_json
            } else if (existsSync(pathB_txt)) {
              translationPath = pathB_txt
              resultPath = pathB_json
            } else {
              break
            }

            const translation = readFileSync(translationPath, 'utf8')
            const originalMeta = existsSync(resultPath)
              ? JSON.parse(readFileSync(resultPath, 'utf8'))
              : {}

            const tgtParas = extractParagraphs(translation)
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

            const entry = {
              chapter: chapter.id,
              repeat: rep,
              score,
              usage: originalMeta.usage,
              elapsed: originalMeta.elapsed,
              error: originalMeta.error
            }

            rescoreResults[workId].push(entry)

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
              timeSec: originalMeta.elapsed ? (originalMeta.elapsed / 1000).toFixed(1) : '-'
            })

            rep++
          }
        }
      }

      const rescoreJsonText = JSON.stringify(
        { rescoredAt: new Date().toISOString(), results: rescoreResults },
        null,
        2
      )
      assertNoSecret(rescoreJsonText)
      writeFileSync(join(runDir, 'rescore.json'), rescoreJsonText, 'utf8')

      // Write report-rescore.md without story text (R6)
      const mdLines: string[] = [
        `# Rescore: ${RUN}`,
        '',
        `- **Rescored At:** ${new Date().toISOString()}`,
        '',
        '| Work | Ch | Rep | Src¶ | Tgt¶ | Match | Residual | Gloss | Forbidden | Time |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
      ]

      for (const r of reportRows) {
        mdLines.push(
          `| ${r.work} | ${r.chapter} | ${r.rep} | ${r.srcParas} | ${r.tgtParas} | ${r.structureOk ? '✓' : '✗'} | ${r.residualChars} | ${r.strictGloss} | ${r.forbidden} | ${r.timeSec}s |`
        )
      }

      const reportText = mdLines.join('\n') + '\n'
      assertNoSecret(reportText)
      writeFileSync(join(runDir, 'report-rescore.md'), reportText, 'utf8')

      expect(reportRows.length).toBeGreaterThan(0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
