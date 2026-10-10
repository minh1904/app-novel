import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const rootArgument = process.argv.indexOf('--root')
const repo =
  rootArgument >= 0 && process.argv[rootArgument + 1]
    ? resolve(process.argv[rootArgument + 1])
    : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const renderer = join(repo, 'src', 'renderer', 'src')
const extensions = ['', '.ts', '.tsx', '.d.ts', '/index.ts', '/index.tsx']

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (['.ts', '.tsx'].includes(extname(path))) out.push(path)
  }
  return out
}

function resolveSpecifier(source, specifier) {
  let base
  if (specifier.startsWith('@renderer/')) base = join(renderer, specifier.slice(10))
  else if (specifier.startsWith('.')) base = resolve(dirname(source), specifier)
  else return null
  for (const suffix of extensions) {
    const candidate = normalize(base + suffix)
    if (existsSync(candidate)) return candidate
  }
  return null
}

function moduleName(path) {
  const rel = relative(renderer, path).split(sep)
  return rel[0] === 'modules' ? rel[1] ?? null : null
}

function layer(path) {
  const rel = relative(renderer, path).split(sep)
  if (rel[0] === 'app') return 'app'
  if (rel[0] === 'modules') return 'module'
  if (rel[0] === 'components' && rel[1] === 'ui') return 'foundation'
  if (rel[0] === 'hooks' || rel[0] === 'lib') return 'foundation'
  return 'other'
}

function specifiers(path) {
  const text = readFileSync(path, 'utf8')
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  const found = []
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) found.push(node.moduleSpecifier.text)
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) found.push(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function inspect() {
  const violations = []
  const graph = new Map()
  const files = walk(renderer)
  for (const source of files) {
    const sourceLayer = layer(source)
    const sourceModule = moduleName(source)
    for (const specifier of specifiers(source)) {
      const target = resolveSpecifier(source, specifier)
      if (!target) continue
      const targetLayer = layer(target)
      const targetModule = moduleName(target)
      const detail = `${relative(repo, source).split(sep).join('/')}: ${specifier}`
      if (sourceLayer === 'module' && targetLayer === 'app')
        violations.push(`${detail} [module-imports-app]`)
      if (sourceLayer === 'foundation' && (targetLayer === 'app' || targetLayer === 'module'))
        violations.push(`${detail} [foundation-imports-owner]`)
      if (sourceLayer === 'app' && targetLayer === 'module' && target.split(sep).at(-1) !== 'public.ts')
        violations.push(`${detail} [app-deep-imports-module]`)
      if (sourceModule && targetModule && sourceModule !== targetModule) {
        if (target.split(sep).at(-1) !== 'public.ts')
          violations.push(`${detail} [module-deep-imports-module]`)
        if (!graph.has(sourceModule)) graph.set(sourceModule, new Set())
        graph.get(sourceModule).add(targetModule)
      }
    }
  }
  const visiting = new Set()
  const visited = new Set()
  const stack = []
  const visit = (name) => {
    if (visiting.has(name)) {
      const at = stack.indexOf(name)
      violations.push(`${stack.slice(at).concat(name).join(' -> ')} [module-cycle]`)
      return
    }
    if (visited.has(name)) return
    visiting.add(name)
    stack.push(name)
    for (const next of graph.get(name) ?? []) visit(next)
    stack.pop()
    visiting.delete(name)
    visited.add(name)
  }
  for (const name of graph.keys()) visit(name)
  for (const old of ['features', 'stores'])
    if (existsSync(join(renderer, old))) violations.push(`src/renderer/src/${old} [legacy-tree-exists]`)
  return { files: files.length, violations: [...new Set(violations)] }
}

const result = inspect()
if (result.violations.length) {
  console.error(`renderer boundaries: ${result.violations.length} violation(s) in ${result.files} files`)
  for (const violation of result.violations) console.error(`  ${violation}`)
  process.exit(1)
}
console.log(`renderer boundaries: ${result.files} files, 0 violations`)
