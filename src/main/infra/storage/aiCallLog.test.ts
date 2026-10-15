import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AI_CALL_LOG_KEEP_MS, appendAiCall, configureAiCallLog, pruneAiCallLogs } from './aiCallLog'

const WORK = '23c0b9a2-d1bc-433e-8104-8c50ee547a57'
const read = (dataDir: string): Array<Record<string, unknown>> =>
  readFileSync(join(dataDir, 'logs', WORK + '.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)

describe('ai call log', () => {
  afterEach(() => configureAiCallLog(null))

  it('does nothing until configured', () => {
    expect(() => appendAiCall(WORK, { kind: 'translate.main' })).not.toThrow()
  })

  it('appends one JSON line per call to the work file, with a timestamp', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'mira-log-'))
    configureAiCallLog(dataDir)
    appendAiCall(WORK, { kind: 'translate.main', raw: '[{"id":"[1]","dst":"“A”"}]' })
    appendAiCall(WORK, { kind: 'translate.result', items: [] })
    const records = read(dataDir)
    expect(records.map((record) => record.kind)).toEqual(['translate.main', 'translate.result'])
    expect(typeof records[0]?.at).toBe('string')
  })

  it('refuses a work id that could leave the log folder', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'mira-log-'))
    configureAiCallLog(dataDir)
    appendAiCall('../library', { kind: 'x' })
    expect(() => readFileSync(join(dataDir, 'library.jsonl'))).toThrow()
  })

  it('drops records older than the window when the app starts', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'mira-log-'))
    configureAiCallLog(dataDir)
    const now = Date.parse('2026-10-15T00:00:00Z')
    const old = new Date(now - AI_CALL_LOG_KEEP_MS - 1).toISOString()
    const fresh = new Date(now - 1000).toISOString()
    writeFileSync(
      join(dataDir, 'logs', WORK + '.jsonl'),
      [
        { at: old, kind: 'old' },
        { at: fresh, kind: 'fresh' }
      ]
        .map((record) => JSON.stringify(record))
        .join('\n') + '\nnot json\n'
    )
    pruneAiCallLogs(join(dataDir, 'logs'), now - AI_CALL_LOG_KEEP_MS)
    expect(read(dataDir).map((record) => record.kind)).toEqual(['fresh'])
  })
})
