// Lệnh chạy toàn bộ kiểm tra chất lượng mã nguồn và bắt buộc phải có bằng chứng đã chạy thực tế.
//
//   node scripts/check.mjs            kiểm tra kiểu (node + web), chạy tests (hai giai đoạn), Biome (lint + format)
//   node scripts/check.mjs --build    tương tự như trên, sau đó build electron-vite
//   node scripts/check.mjs --self-test  chứng minh bước chạy không in kết quả sẽ bị từ chối
//
// Lý do tồn tại: tránh trường hợp câu lệnh thoát mã 0 nhưng không thực sự thực thi các bài kiểm tra.
// Mỗi bước phải đưa ra bằng chứng đã hoàn thành nhiệm vụ (số tệp đã duyệt, số bài test đã pass,
// các tệp build mới hơn thời điểm bắt đầu). Các công cụ được gọi trực tiếp qua node và tệp thực thi
// tương ứng của từng gói.
//
// Kiểm thử chạy qua hai giai đoạn: Giai đoạn A chạy song song các bài kiểm tra thông thường;
// giai đoạn B chạy tuần tự từng tệp đối với năm tệp nhạy cảm với thời gian thực thi (wall-clock time
// hoặc dừng tiến trình con theo timer) để tránh lỗi chập chờn khi tranh chấp CPU. Mọi bài test đều
// chạy đúng một lần và phải vượt qua.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Tăng mốc này khi xóa bớt bài kiểm thử có chủ đích; mốc này không được giảm ngoài ý muốn. */
const BASELINE_TESTS = 1523

/** Khớp theo tên tệp để không bị ảnh hưởng khi tệp được di chuyển thư mục. */
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

/** Thực thi `node <script> ...args` tại thư mục gốc của kho mã nguồn và thu thập đầu ra. */
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
 * Một bước chỉ được coi là đạt khi công cụ trả về mã thoát 0 VÀ hàm `proof` tìm thấy bằng chứng thực thi trong đầu ra.
 * Hàm `proof` trả về `{ ok, note }`; nếu thiếu bằng chứng sẽ tính là thất bại.
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
    // Hiển thị chi tiết lỗi nếu bước đó tự mô tả được; nếu không, hiển thị phần cuối của đầu ra.
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

function rendererBoundaries() {
  return step(
    'renderer boundaries',
    () => node(join(root, 'scripts', 'check-renderer-boundaries.mjs')),
    (text) => {
      const result = /renderer boundaries: (\d+) files, 0 violations/.exec(text)
      return result && Number(result[1]) > 0
        ? { ok: true, note: result[1] + ' files, 0 violations' }
        : { ok: false, note: 'checker printed no successful file count' }
    }
  )
}

/** Đọc dòng tổng kết của vitest: cả hai số lượng đều phải tồn tại và không có bài test nào thất bại. */
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

// `biome ci` thực hiện lint và kiểm tra định dạng mà không ghi tệp; tệp sai định dạng được coi là lỗi.
function lint() {
  return step(
    'biome',
    () =>
      node(bin('@biomejs', 'biome', 'bin', 'biome'), [
        'ci',
        '--reporter=json',
        '--max-diagnostics=none'
      ]),
    (text) => {
      let report
      try {
        report = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
      } catch {
        return { ok: false, note: 'biome did not print its JSON report, so it did not run' }
      }
      const { summary, diagnostics } = report
      const files = (summary?.changed ?? 0) + (summary?.unchanged ?? 0)
      const note =
        files + ' files, ' + summary?.errors + ' errors, ' + summary?.warnings + ' warnings'
      const lines = (diagnostics ?? [])
        .filter((diagnostic) => diagnostic.severity === 'error')
        .map((diagnostic) => {
          const where = posix(diagnostic.location?.path ?? '?')
          const line = diagnostic.location?.start?.line
          return where + (line ? ':' + line : '') + '  ' + diagnostic.category + '  ' + diagnostic.message
        })
        .slice(0, 30)
      return files > 0 && summary.errors === 0 ? { ok: true, note } : { ok: false, note, lines }
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

/** Kiểm tra cơ chế kiểm thử: một bước không in kết quả nhưng thoát mã 0 phải bị coi là không hợp lệ. */
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

  outcomes.push(rendererBoundaries())
  outcomes.push(typecheck('node'))
  outcomes.push(typecheck('web'))
  outcomes.push(typecheck('scripts'))

  // Khớp chính xác tên tệp gốc, không dùng hậu tố: tránh trường hợp tệp bị chạy ở cả hai giai đoạn và bị đếm trùng.
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
