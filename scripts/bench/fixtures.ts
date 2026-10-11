import * as fs from 'node:fs'
import * as path from 'node:path'
import * as v from 'valibot'
import {
  WorkFixtureSchema,
  GlossaryFileSchema,
  PronounsFileSchema,
  ChapterMetaSchema,
  AssertionsFileSchema,
  getWorkId,
  type WorkFixture,
  type GlossaryFile,
  type PronounsFile,
  type ChapterMeta,
  type AssertionsFile
} from '../../src/shared/contracts/fixture'
import {
  checkWorkFixture,
  type LoadedWorkFixture,
  type ChapterFixtureData,
  type FixtureIssue
} from '../../src/measurement/fixtureCheck'

export const FIXTURES_ROOT = path.resolve(__dirname, '../../fixtures')

export interface LoadFixturesResult {
  works: LoadedWorkFixture[]
  usedWorkIds: string[]
  issues: Array<{ workId: string; issues: FixtureIssue[] }>
}

/**
 * Tải toàn bộ fixture từ fixtures/public và fixtures/private (nếu có).
 * Xác thực cấu trúc schema và các quy tắc kiểm tra.
 */
export function loadFixtures(options?: {
  fixturesRoot?: string
  onlyWorkIds?: string[]
  skipCheck?: boolean
}): LoadFixturesResult {
  const root = options?.fixturesRoot ?? FIXTURES_ROOT
  const works: LoadedWorkFixture[] = []
  const allIssues: Array<{ workId: string; issues: FixtureIssue[] }> = []

  for (const scope of ['public', 'private'] as const) {
    const isPublic = scope === 'public'
    const scopeDir = path.join(root, scope)
    if (!fs.existsSync(scopeDir)) continue

    for (const dirName of fs.readdirSync(scopeDir)) {
      const workDir = path.join(scopeDir, dirName)
      if (!fs.statSync(workDir).isDirectory()) continue
      if (dirName === 'runs') continue // bỏ qua thư mục runs trong private

      const workJsonPath = path.join(workDir, 'work.json')
      if (!fs.existsSync(workJsonPath)) continue

      try {
        const rawWork = JSON.parse(fs.readFileSync(workJsonPath, 'utf8'))
        const work: WorkFixture = v.parse(WorkFixtureSchema, rawWork)
        const workId = getWorkId(work) || dirName

        if (options?.onlyWorkIds && !options.onlyWorkIds.includes(workId)) {
          continue
        }

        const glossaryPath = path.join(workDir, 'glossary.json')
        const rawGlossary = fs.existsSync(glossaryPath)
          ? JSON.parse(fs.readFileSync(glossaryPath, 'utf8'))
          : { status: 'draft', entries: [] }
        const glossary: GlossaryFile = v.parse(GlossaryFileSchema, rawGlossary)

        const pronounsPath = path.join(workDir, 'pronouns.json')
        const rawPronouns = fs.existsSync(pronounsPath)
          ? JSON.parse(fs.readFileSync(pronounsPath, 'utf8'))
          : { pairs: [] }
        const pronouns: PronounsFile = v.parse(PronounsFileSchema, rawPronouns)

        const chaptersDir = path.join(workDir, 'chapters')
        const chapters: ChapterFixtureData[] = []

        if (fs.existsSync(chaptersDir)) {
          for (const chName of fs.readdirSync(chaptersDir).sort()) {
            const chDir = path.join(chaptersDir, chName)
            if (!fs.statSync(chDir).isDirectory()) continue

            const sourcePath = path.join(chDir, 'source.txt')
            if (!fs.existsSync(sourcePath)) {
              throw new Error(`Chương ${chName} của tác phẩm ${workId} thiếu source.txt`)
            }
            const sourceText = fs.readFileSync(sourcePath, 'utf8')

            const metaPath = path.join(chDir, 'meta.json')
            const rawMeta = fs.existsSync(metaPath)
              ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
              : { id: chName, paragraphs: 0 }
            const meta: ChapterMeta = v.parse(ChapterMetaSchema, rawMeta)

            const assertionsPath = path.join(chDir, 'assertions.json')
            const rawAssertions = fs.existsSync(assertionsPath)
              ? JSON.parse(fs.readFileSync(assertionsPath, 'utf8'))
              : { status: 'draft', rules: [] }
            const assertions: AssertionsFile = v.parse(AssertionsFileSchema, rawAssertions)

            const refPath = path.join(chDir, 'reference.vi.txt')
            const referenceViText = fs.existsSync(refPath)
              ? fs.readFileSync(refPath, 'utf8')
              : undefined

            chapters.push({
              id: chName,
              sourceText,
              meta,
              assertions,
              referenceViText
            })
          }
        }

        const loadedFixture: LoadedWorkFixture = {
          work,
          isPublic,
          glossary,
          pronouns,
          chapters
        }

        if (!options?.skipCheck) {
          const issues = checkWorkFixture(loadedFixture)
          if (issues.length > 0) {
            allIssues.push({ workId, issues })
          }
        }

        works.push(loadedFixture)
      } catch (err: any) {
        console.warn(`Lỗi nạp fixture ${dirName}: ${err.message}`)
      }
    }
  }

  const usedWorkIds = works.map((w) => getWorkId(w.work))
  return { works, usedWorkIds, issues: allIssues }
}
