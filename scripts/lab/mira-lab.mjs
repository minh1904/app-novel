// Chạy Mira Lab: đóng gói `cli.ts` bằng esbuild (đã có trong node_modules) rồi chạy bằng Node.
// Gói nằm trong node_modules/.cache để import thư viện ngoài (valibot…) vẫn tìm thấy node_modules.
//   node scripts/lab/mira-lab.mjs help
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const outDir = join(root, 'node_modules', '.cache', 'mira-lab')
mkdirSync(outDir, { recursive: true })
const outfile = join(outDir, 'cli.mjs')

await build({
  entryPoints: [join(root, 'scripts', 'lab', 'cli.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  logLevel: 'warning'
})

await import(pathToFileURL(outfile).href)
