/**
 * Chấm lại một lượt chạy Bộ đo đã lưu bằng bộ kiểm hiện tại trong `score.ts`, không gọi API. Dùng khi thêm
 * phép kiểm mới hay sửa glossary/quy tắc mà không muốn dịch lại.
 *
 *   node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/rescore.run.ts
 *
 * MIRA_BENCH_RUN: tên thư mục trong `fixtures/private/runs/` (mặc định: lượt mới nhất có `report.json`).
 * Ghi `rescore.json` và `report-rescore.md` cạnh báo cáo gốc; giữ nguyên token, thời gian và lỗi của lượt gốc.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeRaw } from '../../src/shared/algorithms/rawText'
import { loadChapters, reportTable, score, summarize, type Score } from './score'

const ROOT = process.cwd()
const RUNS = join(ROOT, 'fixtures', 'private', 'runs')

function pickRun(): string | null {
  if (process.env.MIRA_BENCH_RUN) return process.env.MIRA_BENCH_RUN
  if (!existsSync(RUNS)) return null
  const done = readdirSync(RUNS)
    .filter((name) => existsSync(join(RUNS, name, 'report.json')))
    .sort()
  return done.at(-1) ?? null
}

const RUN = pickRun()

describe.skipIf(RUN === null)(`Bộ đo — chấm lại lượt ${RUN}`, () => {
  it('chấm lại mọi bản dịch đã lưu', () => {
    const runDir = join(RUNS, RUN!)
    const original = JSON.parse(readFileSync(join(runDir, 'report.json'), 'utf8')) as {
      model: string
      label?: string
      commit: string
      repeats: number
      summary: Array<Record<string, unknown>>
    }
    const carried = new Map(original.summary.map((row) => [row.chapter as string, row]))

    const summary: Array<Record<string, unknown>> = []
    for (const chapter of loadChapters(ROOT)) {
      const dir = join(runDir, chapter.work, chapter.id)
      if (!existsSync(dir)) continue
      const normalized = normalizeRaw(chapter.source).text
      const scores: Score[] = []
      for (let rep = 1; existsSync(join(dir, `rep-${rep}.vi.txt`)); rep++) {
        const before = JSON.parse(readFileSync(join(dir, `rep-${rep}.json`), 'utf8')) as Score
        const target = readFileSync(join(dir, `rep-${rep}.vi.txt`), 'utf8').replace(/\n$/, '')
        const s = score(chapter, normalized, target, before.segments, before.written)
        scores.push(s)
        writeFileSync(join(dir, `rep-${rep}.rescore.json`), JSON.stringify(s, null, 2), 'utf8')
      }
      const old = carried.get(`${chapter.work}/${chapter.id}`) ?? {}
      summary.push(
        summarize(chapter, scores, {
          usage: old.usage,
          httpCalls: old.httpCalls,
          seconds: old.seconds,
          errors: old.errors
        })
      )
    }
    expect(summary.length).toBeGreaterThan(0)

    writeFileSync(
      join(runDir, 'rescore.json'),
      JSON.stringify({ ...original, rescoredAt: new Date().toISOString(), summary }, null, 2),
      'utf8'
    )
    const title = `# Chấm lại: ${original.label ?? 'baseline'} ${original.model} (lượt ${RUN}, commit ${original.commit}, ${original.repeats} lần mỗi chương)`
    writeFileSync(join(runDir, 'report-rescore.md'), reportTable(title, summary), 'utf8')
    console.log(reportTable(title, summary))
  })
})
