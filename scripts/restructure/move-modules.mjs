// One-off tool for change `refactor-electron-structure`: moves modules and rewrites every reference.
// It is removed when the change is done (task 8.1); git history keeps it.
//
//   node scripts/restructure/move-modules.mjs <phase> --dry-run   show what would move and change
//   node scripts/restructure/move-modules.mjs <phase> --apply     git mv + rewrite, record the moves
//   node scripts/restructure/move-modules.mjs <phase> --prove     only specifiers changed vs HEAD
//   node scripts/restructure/move-modules.mjs --verify            every relative reference resolves
//
// What it rewrites (design D4): relative module specifiers in `from '..'`, `import '..'`,
// `import('..')`, `vi.mock('..')` (and doMock, unmock, importActual, importMock) and `require('..')`,
// plus `join(__dirname, '..')` / `resolve(__dirname, '..')` paths, because some tests read sibling
// files that way (crash tests spawn children, one test reads source text). Nothing else is touched:
// line endings and every other byte are kept, which --prove checks against HEAD.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, writeFileSync } from 'node:fs'
import { dirname as osDirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = osDirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const toOs = (path) => join(root, ...path.split('/'))
const MOVES_FILE = join(here, 'moves.json')
const APPLIED_FILE = join(here, 'applied-moves.json')

const TEXT_EXT = /\.(ts|tsx|mts|cts|mjs|cjs|js)$/
const ROOT_FILES = ['electron.vite.config.ts', 'vitest.config.ts', 'eslint.config.mjs']
const WALK_DIRS = ['src', 'scripts', 'docs', 'openspec']
/** Build outputs that `join(__dirname, ..)` points at in main/index.ts; they are not source files. */
const BUILD_PATHS = new Set(['../preload/index.js', '../renderer/index.html'])

const MODULE = 'module'
const PATH = 'path'
const FORMS = [
  { name: "from '..'", kind: MODULE, re: /(\bfrom\s*)(['"])(\.{1,2}(?:\/[^'"\r\n]*)?)\2/g },
  { name: "import '..'", kind: MODULE, re: /(\bimport\s*)(['"])(\.{1,2}\/[^'"\r\n]*)\2/g },
  { name: "import('..')", kind: MODULE, re: /(\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"\r\n]*)\2/g },
  {
    name: "vi.mock('..')",
    kind: MODULE,
    re: /(\bvi\.(?:mock|doMock|unmock|importActual|importMock)\s*(?:<[^>()]*>)?\s*\(\s*)(['"])(\.{1,2}\/[^'"\r\n]*)\2/g
  },
  { name: "require('..')", kind: MODULE, re: /(\brequire\s*\(\s*)(['"])(\.{1,2}\/[^'"\r\n]*)\2/g },
  {
    name: 'join/resolve(__dirname, ..)',
    kind: PATH,
    re: /(\b(?:join|resolve)\(\s*__dirname\s*,\s*)(['"])([^'"\r\n]+)\2/g
  }
]
const MODULE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.d.ts', '.mjs', '.js', '.json']

// ----------------------------------------------------------------------------------- the tree

function walk(dir, out) {
  for (const entry of readdirSync(toOs(dir), { withFileTypes: true })) {
    const path = dir + '/' + entry.name
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') walk(path, out)
    } else out.push(path)
  }
}

function loadTree() {
  const list = []
  for (const dir of WALK_DIRS) if (existsSync(toOs(dir))) walk(dir, list)
  for (const file of ROOT_FILES) if (existsSync(toOs(file))) list.push(file)
  const files = new Set(list)
  const dirs = new Set()
  for (const file of list) {
    let dir = posix.dirname(file)
    while (dir !== '.' && !dirs.has(dir)) {
      dirs.add(dir)
      dir = posix.dirname(dir)
    }
  }
  return { files, dirs }
}

function resolveModule(fromFile, spec, files) {
  const base = posix.normalize(posix.join(posix.dirname(fromFile), spec))
  if (files.has(base)) return { target: base, ext: '', index: false }
  for (const ext of MODULE_EXTENSIONS) if (files.has(base + ext)) return { target: base + ext, ext, index: false }
  for (const index of ['/index.ts', '/index.tsx']) {
    if (files.has(base + index)) return { target: base + index, ext: index, index: true }
  }
  return null
}

function resolvePath(fromFile, relative, tree) {
  const base = posix.normalize(posix.join(posix.dirname(fromFile), relative.split('\\').join('/')))
  return tree.files.has(base) || tree.dirs.has(base) ? base : null
}

// ------------------------------------------------------------------------------ the move map

function readMoves() {
  return JSON.parse(readFileSync(MOVES_FILE, 'utf8'))
}

function rankOf(dir, layerRank) {
  for (const [prefix, rank] of Object.entries(layerRank)) {
    if (dir === prefix || dir.startsWith(prefix + '/')) return rank
  }
  return null
}

function moduleTargets(file, text, files) {
  const targets = []
  for (const form of FORMS) {
    if (form.kind !== MODULE) continue
    for (const match of text.matchAll(form.re)) {
      const found = resolveModule(file, match[3], files)
      if (found !== null) targets.push(found.target)
    }
  }
  return targets
}

function stemOf(file) {
  return posix.basename(file).replace(/\.test\.(ts|tsx)$/, '').replace(/\.(ts|tsx)$/, '')
}

/** Builds old -> new for one phase, and explains where each test went. */
function buildMap(phaseName, tree) {
  const moves = readMoves()
  const phase = moves.phases[phaseName]
  if (phase === undefined) throw new Error('unknown phase: ' + phaseName)
  const fileMap = new Map()

  for (const [from, to] of Object.entries(phase.files)) {
    if (!tree.files.has(from)) throw new Error('missing source file: ' + from)
    fileMap.set(from, to)
  }
  for (const [fromDir, toDir] of Object.entries(phase.dirs ?? {})) {
    for (const file of tree.files) {
      if (file.startsWith(fromDir + '/')) fileMap.set(file, toDir + file.slice(fromDir.length))
    }
  }

  const explicitDestinationDirs = (file) => {
    const target = fileMap.get(file)
    return target === undefined ? null : posix.dirname(target)
  }

  const testReport = []
  const overrides = phase.testOverrides ?? {}
  for (const file of [...tree.files].sort()) {
    if (!/\.test\.(ts|tsx)$/.test(file) || fileMap.has(file)) continue
    const inScope = (phase.testsFrom ?? []).some((dir) => posix.dirname(file) === dir)
    if (!inScope) continue
    if (overrides[file] !== undefined) {
      fileMap.set(file, overrides[file])
      testReport.push({ file, to: overrides[file], why: 'override', disagree: false })
      continue
    }

    const text = readFileSync(toOs(file), 'utf8')
    const counts = new Map()
    for (const target of moduleTargets(file, text, tree.files)) {
      const dir = explicitDestinationDirs(target)
      if (dir === null || dir === 'src/main/testing' || /\.test\./.test(target)) continue
      counts.set(dir, (counts.get(dir) ?? 0) + 1)
    }
    const stem = stemOf(file)
    // Only a module from the same old directory counts: `ipc/library.ts` must not claim
    // `storage/library.test.ts`.
    const stemSource = [...fileMap.keys()].find(
      (from) =>
        !/\.test\./.test(from) && posix.dirname(from) === posix.dirname(file) && stemOf(from) === stem
    )
    const stemDir = stemSource === undefined ? null : posix.dirname(fileMap.get(stemSource))

    const ranked = [...counts.entries()].sort((a, b) => {
      const rankA = rankOf(a[0], moves.layerRank) ?? -1
      const rankB = rankOf(b[0], moves.layerRank) ?? -1
      if (rankA !== rankB) return rankB - rankA
      if ((a[0] === stemDir) !== (b[0] === stemDir)) return a[0] === stemDir ? -1 : 1
      if (a[1] !== b[1]) return b[1] - a[1]
      return a[0] < b[0] ? -1 : 1
    })
    // A test lives next to the module it is named after; only a test with no such module goes with
    // the highest layer it imports. Tests may import across layers, so this keeps them findable.
    const chosen = stemDir ?? (ranked.length > 0 ? ranked[0][0] : null)
    if (chosen === null) {
      testReport.push({ file, to: null, why: 'unclassified', disagree: false })
      continue
    }
    fileMap.set(file, chosen + '/' + posix.basename(file))
    testReport.push({
      file,
      to: chosen + '/' + posix.basename(file),
      why: ranked.map(([dir, n]) => dir.replace('src/main/', '') + ' x' + n).join(', ') || 'same-name source',
      disagree: false,
      stemDir,
      higher:
        stemDir !== null &&
        ranked.length > 0 &&
        (rankOf(ranked[0][0], moves.layerRank) ?? -1) > (rankOf(stemDir, moves.layerRank) ?? -1)
          ? ranked[0][0]
          : null
    })
  }

  const moveOf = (path) => {
    if (fileMap.has(path)) return fileMap.get(path)
    for (const [fromDir, toDir] of Object.entries(phase.dirs ?? {})) {
      if (path === fromDir) return toDir
    }
    return null
  }
  return { fileMap, moveOf, testReport, layerRank: moves.layerRank }
}

// ----------------------------------------------------------------------------- the rewriting

function newSpecifier(fromNew, targetNew, found) {
  if (found.index) throw new Error('imports through an index file are not supported: ' + targetNew)
  let relative = posix.relative(posix.dirname(fromNew), targetNew)
  if (found.ext !== '') relative = relative.slice(0, relative.length - found.ext.length)
  return relative.startsWith('.') ? relative : './' + relative
}

function newPathLiteral(fromNew, targetNew) {
  return posix.relative(posix.dirname(fromNew), targetNew)
}

/** Rewrites one file's text; returns the new text and what it did. */
function rewrite(file, text, tree, moveOf, notes) {
  const fromNew = moveOf(file) ?? file
  let out = text
  for (const form of FORMS) {
    out = out.replace(form.re, (whole, before, quote, spec) => {
      if (form.kind === MODULE) {
        const found = resolveModule(file, spec, tree.files)
        if (found === null) {
          notes.unresolved.push({ file, spec, form: form.name })
          return whole
        }
        const targetNew = moveOf(found.target) ?? found.target
        if (fromNew === file && targetNew === found.target) return whole
        const next = newSpecifier(fromNew, targetNew, found)
        if (next === spec) return whole
        notes.rewrites.set(form.name, (notes.rewrites.get(form.name) ?? 0) + 1)
        return before + quote + next + quote
      }
      const target = resolvePath(file, spec, tree)
      if (target === null) {
        notes.ignoredPaths.push({ file, spec })
        return whole
      }
      const targetNew = moveOf(target) ?? target
      if (fromNew === file && targetNew === target) return whole
      const next = newPathLiteral(fromNew, targetNew)
      if (next === spec) return whole
      notes.rewrites.set(form.name, (notes.rewrites.get(form.name) ?? 0) + 1)
      return before + quote + next + quote
    })
  }
  return out
}

function planRewrites(tree, moveOf) {
  const notes = { rewrites: new Map(), unresolved: [], ignoredPaths: [] }
  const changed = new Map()
  for (const file of [...tree.files].sort()) {
    if (!TEXT_EXT.test(file)) continue
    if (!file.startsWith('src/') && !file.startsWith('scripts/') && !ROOT_FILES.includes(file)) continue
    if (file.startsWith('scripts/restructure/')) continue
    const text = readFileSync(toOs(file), 'utf8')
    const next = rewrite(file, text, tree, moveOf, notes)
    if (next !== text) changed.set(file, next)
  }
  return { changed, notes }
}

// ------------------------------------------------------------------------ layer preflight

function layerPreflight(tree, moveOf, layerRank) {
  const problems = []
  const exempt = (path) =>
    /\.test\.(ts|tsx)$/.test(path) || /\/crash[A-Za-z]*\.ts$/.test(path) || path.startsWith('src/main/testing/')
  for (const file of tree.files) {
    if (!file.startsWith('src/main/') || !TEXT_EXT.test(file)) continue
    const fromNew = moveOf(file) ?? file
    if (exempt(fromNew)) continue
    const fromDir = posix.dirname(fromNew)
    const fromRank = rankOf(fromDir, layerRank)
    const text = readFileSync(toOs(file), 'utf8')
    for (const target of moduleTargets(file, text, tree.files)) {
      const targetNew = moveOf(target) ?? target
      const targetDir = posix.dirname(targetNew)
      if (!targetNew.startsWith('src/main/') || targetNew.startsWith('src/main/testing/')) continue
      const targetRank = rankOf(targetDir, layerRank)
      if (fromRank !== null && targetRank !== null && fromRank < targetRank) {
        problems.push(fromNew + ' (rank ' + fromRank + ') imports ' + targetNew + ' (rank ' + targetRank + ')')
      }
      if (fromDir.startsWith('src/main/services/library') && targetDir.startsWith('src/main/services/ai')) {
        problems.push(fromNew + ' (services/library) imports ' + targetNew + ' (services/ai)')
      }
    }
  }
  return [...new Set(problems)].sort()
}

// ------------------------------------------------------------------------------- the modes

function dryRun(phaseName) {
  const tree = loadTree()
  const { fileMap, moveOf, testReport, layerRank } = buildMap(phaseName, tree)

  const destinations = new Map()
  const collisions = []
  for (const [from, to] of fileMap) {
    if (destinations.has(to)) collisions.push(to + ' <- ' + destinations.get(to) + ' and ' + from)
    destinations.set(to, from)
    if (tree.files.has(to) && !fileMap.has(to)) collisions.push(to + ' already exists')
  }

  const { changed, notes } = planRewrites(tree, moveOf)
  const preflight = layerPreflight(tree, moveOf, layerRank)

  console.log('phase: ' + phaseName)
  console.log('files to move: ' + fileMap.size + ' (' + testReport.length + ' of them tests placed by rule)')
  console.log('files whose text changes: ' + changed.size + ' (' + [...changed.keys()].filter((f) => !fileMap.has(f)).length + ' not moved)')
  console.log('rewrites by form:')
  for (const [name, count] of [...notes.rewrites.entries()].sort()) console.log('  ' + String(count).padStart(4) + '  ' + name)

  console.log('\nmove table (old -> new):')
  for (const [from, to] of [...fileMap.entries()].sort((a, b) => (a[1] < b[1] ? -1 : 1))) {
    console.log('  ' + from.replace('src/main/', '').padEnd(46) + ' -> ' + to.replace('src/main/', ''))
  }

  console.log('\ntest placement (rule: next to the module it is named after, else the highest layer it imports):')
  for (const t of testReport) {
    const flag = t.higher
      ? '  [named after a module in ' + t.stemDir.replace('src/main/', '') + ', also imports ' + t.higher.replace('src/main/', '') + ']'
      : ''
    console.log('  ' + t.file.replace('src/main/', '').padEnd(40) + ' -> ' + (t.to ?? 'UNCLASSIFIED').replace('src/main/', '') + '   (' + t.why + ')' + flag)
  }

  const problems = []
  if (collisions.length > 0) problems.push('collisions:\n  ' + collisions.join('\n  '))
  if (notes.unresolved.length > 0) {
    problems.push(
      'unresolved specifiers:\n  ' + notes.unresolved.map((u) => u.file + '  ' + u.form + '  ' + u.spec).join('\n  ')
    )
  }
  if (testReport.some((t) => t.to === null)) problems.push('some tests are unclassified: add them to testOverrides')
  if (preflight.length > 0) problems.push('layer violations in the proposed layout:\n  ' + preflight.join('\n  '))

  if (notes.ignoredPaths.length > 0) {
    console.log('\n__dirname paths that point at no source file (left alone):')
    for (const p of notes.ignoredPaths) console.log('  ' + p.file + '  ' + p.spec)
  }
  console.log('\nlayer preflight: ' + (preflight.length === 0 ? 'no violations' : preflight.length + ' violation(s)'))
  if (problems.length > 0) {
    console.log('\nPROBLEMS:\n' + problems.join('\n'))
    return 1
  }
  console.log('\ndry-run ok: nothing was written')
  return 0
}

function apply(phaseName) {
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })
  const dirty = status.split('\n').filter((line) => line.trim() !== '' && !line.includes('winget') && !line.includes('openspec/changes/refactor-electron-structure'))
  if (dirty.length > 0) {
    console.log('refusing to run on a dirty tree:\n' + dirty.join('\n'))
    return 1
  }
  const tree = loadTree()
  const { fileMap, moveOf, testReport } = buildMap(phaseName, tree)
  const { changed, notes } = planRewrites(tree, moveOf)
  if (notes.unresolved.length > 0 || testReport.some((t) => t.to === null)) {
    console.log('run --dry-run first: there are unresolved specifiers or unclassified tests')
    return 1
  }
  for (const to of fileMap.values()) {
    if (existsSync(toOs(to))) {
      console.log('destination already exists: ' + to)
      return 1
    }
  }

  const contents = new Map()
  for (const from of fileMap.keys()) contents.set(from, changed.get(from) ?? null)
  for (const [from, to] of fileMap) {
    mkdirSync(toOs(posix.dirname(to)), { recursive: true })
    execFileSync('git', ['mv', from, to], { cwd: root })
    const text = contents.get(from)
    if (text !== null) writeFileSync(toOs(to), text)
  }
  for (const [file, text] of changed) {
    if (!fileMap.has(file)) writeFileSync(toOs(file), text)
  }

  const oldDirs = new Set([...fileMap.keys()].map((from) => posix.dirname(from)))
  for (const dir of [...oldDirs].sort((a, b) => b.length - a.length)) {
    let current = dir
    while (current !== 'src' && current !== '.') {
      try {
        rmdirSync(toOs(current))
      } catch {
        break
      }
      current = posix.dirname(current)
    }
  }

  const applied = existsSync(APPLIED_FILE) ? JSON.parse(readFileSync(APPLIED_FILE, 'utf8')) : {}
  applied[phaseName] = Object.fromEntries([...fileMap.entries()].sort())
  writeFileSync(APPLIED_FILE, JSON.stringify(applied, null, 2) + '\n')

  console.log('moved ' + fileMap.size + ' files, rewrote text in ' + changed.size + ' files')
  for (const [name, count] of [...notes.rewrites.entries()].sort()) console.log('  ' + String(count).padStart(4) + '  ' + name)
  console.log('recorded in scripts/restructure/applied-moves.json')
  return 0
}

/** The text with every reference the tool may rewrite replaced by a fixed mark. */
function normalise(text) {
  let out = text
  for (const form of FORMS) out = out.replace(form.re, (whole, before, quote) => before + quote + '(ref)' + quote)
  return out
}

/**
 * git stores LF while a Windows working copy has CRLF (core.autocrlf), so both sides are compared
 * with LF. Text sources are also compared with their references masked.
 */
function sameApartFromReferences(path, before, after) {
  const lf = (buffer) => buffer.toString('utf8').replace(/\r\n/g, '\n')
  return TEXT_EXT.test(path) ? normalise(lf(before)) === normalise(lf(after)) : lf(before) === lf(after)
}

function gitShow(path) {
  try {
    return execFileSync('git', ['show', 'HEAD:' + path], { cwd: root, maxBuffer: 256 * 1024 * 1024 })
  } catch {
    return null
  }
}

function prove(phaseName) {
  const applied = JSON.parse(readFileSync(APPLIED_FILE, 'utf8'))[phaseName]
  if (applied === undefined) throw new Error('no recorded moves for phase ' + phaseName)
  let same = 0
  const bad = []
  const skipped = []
  const moved = new Set()

  for (const [from, to] of Object.entries(applied)) {
    moved.add(from)
    moved.add(to)
    const before = gitShow(from)
    if (before === null) {
      skipped.push(from + ' (not in HEAD)')
      continue
    }
    if (sameApartFromReferences(to, before, readFileSync(toOs(to)))) same++
    else bad.push(from + ' -> ' + to)
  }

  // Files that were not moved but whose text changed: only source, scripts and root config count.
  const inScope = (path) =>
    path.startsWith('src/') ||
    ROOT_FILES.includes(path) ||
    (path.startsWith('scripts/') && !path.startsWith('scripts/restructure/'))
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((line) => line !== '' && !moved.has(line) && inScope(line))
  for (const file of changed) {
    const before = gitShow(file)
    if (before === null || !existsSync(toOs(file))) continue
    if (sameApartFromReferences(file, before, readFileSync(toOs(file)))) same++
    else bad.push(file + ' (not moved, but changed beyond references)')
  }

  console.log('prove ' + phaseName + ': ' + same + ' files differ from HEAD only in references or not at all')
  for (const note of skipped) console.log('  skipped ' + note)
  if (bad.length > 0) {
    console.log('FAIL: ' + bad.length + ' file(s) changed in some other way:\n  ' + bad.join('\n  '))
    return 1
  }
  console.log('OK: nothing but references changed')
  return 0
}

function verify() {
  const tree = loadTree()
  const failures = []
  let checked = 0
  for (const file of [...tree.files].sort()) {
    if (!TEXT_EXT.test(file)) continue
    if (!file.startsWith('src/') && !file.startsWith('scripts/') && !ROOT_FILES.includes(file)) continue
    if (file.startsWith('scripts/restructure/')) continue
    const text = readFileSync(toOs(file), 'utf8')
    for (const form of FORMS) {
      for (const match of text.matchAll(form.re)) {
        checked++
        const spec = match[3]
        const ok =
          form.kind === MODULE
            ? resolveModule(file, spec, tree.files) !== null
            : BUILD_PATHS.has(spec) || resolvePath(file, spec, tree) !== null
        if (!ok) failures.push(file + '  ' + form.name + '  ' + spec)
      }
    }
  }
  console.log('verify: ' + checked + ' references checked')
  if (failures.length > 0) {
    console.log('FAIL: ' + failures.length + ' unresolved:\n  ' + failures.join('\n  '))
    return 1
  }
  console.log('OK: every relative reference resolves to an existing file or directory')
  return 0
}

function main() {
  const args = process.argv.slice(2)
  const phase = args.find((arg) => !arg.startsWith('--'))
  if (args.includes('--verify')) return verify()
  if (phase === undefined) {
    console.log('usage: move-modules.mjs <phase> --dry-run | --apply | --prove   or   --verify')
    return 1
  }
  if (args.includes('--apply')) return apply(phase)
  if (args.includes('--prove')) return prove(phase)
  return dryRun(phase)
}

process.exit(main())
