// One command that runs every check and cannot pass without proof that it ran.
//
//   node scripts/check.mjs            typecheck (node + web), tests (two phases), lint
//   node scripts/check.mjs --build    the same, then electron-vite build
//   node scripts/check.mjs --self-test  prove that a silent step is rejected
//
// Why this exists: on this machine `pnpm test`, `pnpm lint` and `pnpm typecheck` print a warning about
// the `pnpm` field of package.json and exit 0 without running anything. A step that prints nothing and
// exits 0 is therefore never read as a pass here: every step must show evidence that it did its work
// (a file count, a test count, built files that are newer than the step). The tools are called through
// node and the package's own entry file, so neither pnpm nor a .cmd shim is involved.
//
// Tests run in two phases. Five files assert on wall-clock time or kill child processes on a timer, and
// they fail intermittently when 60 files compete for the CPU (measured: see openspec/changes/archive/
// 2026-10-03-refactor-electron-structure/baseline.md). Phase A runs everything else in parallel; phase B runs those
// five one at a time. Every test still runs exactly once and has to pass.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Raise this when tests are removed on purpose; it must never drop by accident. */
const BASELINE_TESTS = 904

/** Matched by file name, not by path, so the list survives files being moved. */
const TIMING_SENSITIVE = [
  'rows.test.ts',
  'segmenter.test.ts',
  'segmentMap.test.ts',
  'providers.test.ts',
  'crash.test.ts'
]

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')
const bin = (...parts) => join(root, 'node_modules', ...parts)

function seconds(ms) {
  return (ms / 1000).toFixed(1) + 's'
}

/** Runs `node <script> ...args` in the repo root and keeps what it printed. */
function node(script, args = []) {
  const started = Date.now()
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
  })
  const text = ((result.stdout ?? '') + (result.stderr ?? '')).replace(ANSI, '')
  return { code: result.status, text, ms: Date.now() - started, error: result.error }
}

/**
 * A step passes only when the tool exited 0 *and* `proof` found evidence in what it printed.
 * `proof` returns `{ ok, note }`; a missing proof is a failure, never a pass.
 */
function step(name, run, proof) {
  const result = run()
  const verdict =
    result.error !== undefined
      ? { ok: false, note: 'could not start: ' + result.error.message }
      : proof(result.text)
  const ok = result.code === 0 && verdict.ok
  const note =
    result.code === 0
      ? verdict.note
      : 'exit code ' + String(result.code) + (verdict.note ? '  ' + verdict.note : '')
  console.log((ok ? 'ok    ' : 'FAIL  ') + name.padEnd(24) + seconds(result.ms).padStart(7) + '  ' + note)
  if (!ok) {
    // A step that can describe its own failures does so; otherwise show the tail of what it printed.
    const lines =
      verdict.lines !== undefined && verdict.lines.length > 0
        ? verdict.lines
        : result.text.split('\n').filter((line) => line.trim() !== '').slice(-40)
    console.log(lines.map((line) => '      | ' + line).join('\n'))
  }
  return { ok, detail: verdict }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(full, out)
    } else out.push(full)
  }
  return out
}

function posix(path) {
  return relative(root, path).split('\\').join('/')
}

function typecheck(project) {
  return step(
    'tsc (' + project + ')',
    () =>
      node(bin('typescript', 'bin', 'tsc'), [
        '--noEmit',
        '-p',
        'tsconfig.' + project + '.json',
        '--composite',
        'false',
        '--extendedDiagnostics'
      ]),
    (text) => {
      const files = /^Files:\s+(\d+)/m.exec(text)
      return files !== null && Number(files[1]) > 0
        ? { ok: true, note: files[1] + ' files' }
        : { ok: false, note: 'tsc printed no file count, so it did not run' }
    }
  )
}

/** Reads vitest's summary lines; both counts have to be present, and nothing may have failed. */
function readVitest(text) {
  const tests = /^\s*Tests\s+(.+?)\s*\((\d+)\)\s*$/m.exec(text)
  const files = /^\s*Test Files\s+(.+?)\s*\((\d+)\)\s*$/m.exec(text)
  if (tests === null || files === null) return null
  const count = (summary, label) => {
    const hit = new RegExp('(\\d+) ' + label).exec(summary)
    return hit === null ? 0 : Number(hit[1])
  }
  return {
    passed: count(tests[1], 'passed'),
    failed: count(tests[1], 'failed'),
    fileCount: Number(files[2])
  }
}

function vitestPhase(name, args) {
  let counted = 0
  const outcome = step(
    name,
    () => node(bin('vitest', 'vitest.mjs'), ['run', ...args]),
    (text) => {
      const summary = readVitest(text)
      if (summary === null) return { ok: false, note: 'no "Tests" line in the output, so nothing ran' }
      counted = summary.passed
      const failing = text
        .split('\n')
        .filter((line) => /^\s*FAIL\s/.test(line))
        .slice(0, 6)
        .map((line) => '\n      ' + line.trim())
        .join('')
      return summary.failed === 0 && summary.passed > 0
        ? { ok: true, note: summary.passed + ' tests in ' + summary.fileCount + ' files' }
        : { ok: false, note: summary.failed + ' failed, ' + summary.passed + ' passed' + failing }
    }
  )
  return { ...outcome, passed: counted }
}

function lint() {
  return step(
    'eslint',
    () => node(bin('eslint', 'bin', 'eslint.js'), ['-f', 'json', '.']),
    (text) => {
      let results
      try {
        results = JSON.parse(text)
      } catch {
        return { ok: false, note: 'eslint did not print its JSON report, so it did not run' }
      }
      const errors = results.reduce((sum, file) => sum + file.errorCount, 0)
      const warnings = results.reduce((sum, file) => sum + file.warningCount, 0)
      const note = results.length + ' files, ' + errors + ' errors, ' + warnings + ' warnings'
      const lines = results
        .flatMap((file) =>
          file.messages
            .filter((message) => message.severity === 2)
            .map((message) => {
              const where = posix(file.filePath) + ':' + message.line
              return where + '  ' + (message.ruleId ?? 'parse') + '  ' + message.message
            })
        )
        .slice(0, 30)
      return results.length > 0 && errors === 0 ? { ok: true, note } : { ok: false, note, lines }
    }
  )
}

function build(startedAt) {
  return step(
    'electron-vite build',
    () => node(bin('electron-vite', 'bin', 'electron-vite.js'), ['build']),
    () => {
      const outputs = ['out/main/index.js', 'out/preload/index.js', 'out/renderer/index.html']
      const stale = outputs.filter((file) => {
        const path = join(root, file)
        return !existsSync(path) || statSync(path).mtimeMs < startedAt
      })
      return stale.length === 0
        ? { ok: true, note: outputs.length + ' bundles written' }
        : { ok: false, note: 'not written by this build: ' + stale.join(', ') }
    }
  )
}

/** Proves the harness itself: a step that prints nothing and exits 0 has to be rejected. */
function selfTest() {
  const silent = step(
    'self-test (silent step)',
    () => node('-e', ['']),
    (text) => (text.trim() === '' ? { ok: false, note: 'printed nothing' } : { ok: true, note: '' })
  )
  const detected = silent.ok === false
  console.log(
    detected
      ? 'self-test: a step that prints nothing is rejected, as intended'
      : 'self-test: BROKEN, a silent step was accepted as a pass'
  )
  return detected ? 0 : 1
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--self-test')) return selfTest()

  const startedAt = Date.now()
  const outcomes = []
  console.log('check: ' + root)

  outcomes.push(typecheck('node'))
  outcomes.push(typecheck('web'))

  // Exact base name, not a suffix: `segmenter.test.ts` must not also catch `resegmenter.test.ts`, or
  // that file would run in both phases and be counted twice.
  const sources = walk(join(root, 'src'))
  const timing = TIMING_SENSITIVE.map((name) => ({
    name,
    paths: sources.filter((path) => basename(path) === name)
  }))
  const unmatched = timing.filter((entry) => entry.paths.length !== 1).map((entry) => entry.name)
  if (unmatched.length > 0) {
    console.log('FAIL  each timing-sensitive file must exist exactly once: ' + unmatched.join(', '))
    outcomes.push({ ok: false })
  } else {
    const paths = timing.flatMap((entry) => entry.paths.map(posix))
    const phaseA = vitestPhase(
      'vitest A (parallel)',
      TIMING_SENSITIVE.flatMap((name) => ['--exclude', '**/' + name])
    )
    const phaseB = vitestPhase('vitest B (serial)', ['--no-file-parallelism', ...paths])
    outcomes.push(phaseA, phaseB)
    const total = phaseA.passed + phaseB.passed
    const enough = total >= BASELINE_TESTS
    console.log(
      (enough ? 'ok    ' : 'FAIL  ') +
        'tests total'.padEnd(24) +
        ''.padStart(7) +
        '  ' +
        total +
        ' (baseline ' +
        BASELINE_TESTS +
        ')'
    )
    outcomes.push({ ok: enough })
  }

  outcomes.push(lint())
  if (args.includes('--build')) outcomes.push(build(startedAt))

  const failed = outcomes.filter((outcome) => !outcome.ok).length
  console.log(failed === 0 ? 'RESULT: ok' : 'RESULT: ' + failed + ' step(s) failed')
  return failed === 0 ? 0 : 1
}

process.exit(main())
