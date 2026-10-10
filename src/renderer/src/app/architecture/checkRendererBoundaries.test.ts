import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const checker = join(process.cwd(), 'scripts', 'check-renderer-boundaries.mjs')
const roots: string[] = []

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'mira-boundaries-'))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, 'src', 'renderer', 'src', path)
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, content)
  }
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('renderer boundary checker', () => {
  it('accepts public one-way edges and all static specifier forms', () => {
    const root = fixture({
      'modules/library/public.ts': "export type { Work } from './work'\n",
      'modules/library/work.ts': 'export interface Work { id: string }\n',
      'modules/workspace/public.ts': "export { open } from './open'\n",
      'modules/workspace/open.ts':
        "import type { Work } from '../../modules/library/public'\nexport { type Work } from '../../modules/library/public'\nexport const open = async () => import('../../modules/library/public')\n",
      'app/screen.ts': "import { open } from '../../modules/workspace/public'\nvoid open\n",
      'components/ui/Button.ts': 'export const Button = 1\n',
      'lib/id.ts': 'export const id = <T>(value: T): T => value\n'
    })
    const output = execFileSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' })
    expect(output).toMatch(/0 violations/)
  })

  it.each([
    [
      'app deep import',
      { 'app/a.ts': "import '../modules/library/work'\n", 'modules/library/work.ts': 'export {}\n' }
    ],
    [
      'module imports app',
      { 'app/a.ts': 'export {}\n', 'modules/library/a.ts': "import '../../app/a'\n" }
    ],
    [
      'module deep import',
      {
        'modules/library/work.ts': 'export {}\n',
        'modules/workspace/a.ts': "import '../library/work'\n"
      }
    ],
    [
      'module cycle',
      {
        'modules/library/public.ts': "export { a } from './a'\n",
        'modules/library/a.ts':
          "import { b } from '../../modules/workspace/public'\nexport const a = b\n",
        'modules/workspace/public.ts': "export { b } from './b'\n",
        'modules/workspace/b.ts':
          "import { a } from '../../modules/library/public'\nexport const b = a\n"
      }
    ]
  ])('rejects %s', (_name, files) => {
    const result = spawnSync(process.execPath, [checker, '--root', fixture(files)], {
      encoding: 'utf8'
    })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/violation|cycle/)
  })
})
