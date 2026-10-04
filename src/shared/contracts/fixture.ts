import * as v from 'valibot'
import { SOURCE_LANGUAGES, type SourceLanguage } from './library'

/**
 * Contracts and Valibot schemas for measurement fixtures (measure-fixtures spec).
 * Used by the evaluation harness to validate work, glossary, pronouns, chapter meta,
 * and assertions.
 *
 * Pure schema definition with no Node.js or DOM dependencies.
 */

export const FIXTURE_LANGUAGES = SOURCE_LANGUAGES
export type FixtureLanguage = SourceLanguage

export const GLOSSARY_STATUSES = ['draft', 'approved'] as const
export type GlossaryStatus = (typeof GLOSSARY_STATUSES)[number]

export const PRONOUN_STATUSES = ['draft', 'approved'] as const
export type PronounStatus = (typeof PRONOUN_STATUSES)[number]

export const ASSERTION_STATUSES = ['draft', 'approved'] as const
export type AssertionStatus = (typeof ASSERTION_STATUSES)[number]

// --- Work schema ---

export const WorkFixtureSchema = v.pipe(
  v.object({
    slug: v.optional(v.string('slug phải là chuỗi')),
    id: v.optional(v.string('id phải là chuỗi')),
    lang: v.picklist(FIXTURE_LANGUAGES, 'Ngôn ngữ nguồn không được hỗ trợ.'),
    title: v.nullable(v.string()),
    author: v.optional(v.nullable(v.string())),
    published: v.optional(v.string()),
    url: v.optional(v.nullable(v.string())),
    revision: v.optional(v.union([v.number(), v.string()])),
    fetched: v.optional(v.string()),
    rights: v.optional(v.string()),
    license: v.optional(v.string()),
    copyrightNote: v.optional(v.string()),
    genre: v.optional(v.string()),
    source: v.optional(v.string()),
    documents: v.optional(v.array(v.string())),
    edits: v.optional(v.string()),
    referenceCaveat: v.optional(v.string()),
    notes: v.optional(v.string()),
    modifications: v.optional(v.array(v.string())),
    chapters: v.array(v.string(), 'chapters phải là danh sách chuỗi số chương')
  }),
  v.check(
    (work) => Boolean(work.slug || work.id),
    'Tác phẩm phải có trường slug hoặc id.'
  )
)

export type WorkFixture = v.InferOutput<typeof WorkFixtureSchema>

// Helper to get work ID/slug
export function getWorkId(work: { slug?: string; id?: string }): string {
  return work.id ?? work.slug ?? ''
}

// --- Glossary schema ---

export const GlossaryAliasObjectSchema = v.object({
  src: v.string(),
  tgt: v.string()
})

export const GlossaryAliasSchema = v.union([v.string(), GlossaryAliasObjectSchema])
export type GlossaryAlias = v.InferOutput<typeof GlossaryAliasSchema>

export const GlossaryEntrySchema = v.object({
  src: v.string('src phải là chuỗi'),
  tgt: v.string('tgt phải là chuỗi'),
  type: v.optional(v.string()),
  aliases: v.optional(v.array(GlossaryAliasSchema)),
  alternatives: v.optional(v.array(v.string())),
  forbidden: v.optional(v.array(v.string())),
  note: v.optional(v.string()),
  decision: v.optional(v.boolean('decision phải là boolean'))
})

export type GlossaryEntry = v.InferOutput<typeof GlossaryEntrySchema>

export const GlossaryFileSchema = v.union([
  v.object({
    status: v.picklist(GLOSSARY_STATUSES, 'Trạng thái glossary không hợp lệ'),
    approved: v.optional(v.string()),
    note: v.optional(v.string()),
    entries: v.array(GlossaryEntrySchema)
  }),
  v.array(GlossaryEntrySchema)
])

export type GlossaryFile = v.InferOutput<typeof GlossaryFileSchema>

export function normalizeGlossaryEntries(file: GlossaryFile): {
  status: GlossaryStatus
  approved?: string
  note?: string
  entries: GlossaryEntry[]
} {
  if (Array.isArray(file)) {
    return { status: 'draft', entries: file }
  }
  return file
}

// --- Pronouns schema ---

export const PronounPairSchema = v.object({
  speaker: v.string('speaker phải là chuỗi'),
  listener: v.string('listener phải là chuỗi'),
  self: v.nullable(v.string()),
  address: v.nullable(v.string()),
  alternatives: v.optional(v.array(v.any())),
  fromChapter: v.optional(v.union([v.string(), v.number()])),
  toChapter: v.optional(v.union([v.string(), v.number()])),
  note: v.optional(v.string()),
  decision: v.optional(v.boolean('decision phải là boolean'))
})

export type PronounPair = v.InferOutput<typeof PronounPairSchema>

export const PronounsFileSchema = v.object({
  status: v.optional(v.picklist(PRONOUN_STATUSES, 'Trạng thái pronouns không hợp lệ')),
  approved: v.optional(v.string()),
  note: v.optional(v.string()),
  pov: v.optional(v.string()),
  narrator: v.optional(v.nullable(v.string())),
  narration: v.optional(v.array(v.any())),
  pairs: v.array(PronounPairSchema)
})

export type PronounsFile = v.InferOutput<typeof PronounsFileSchema>

// --- Chapter Meta schema ---

export const ChapterMetaSchema = v.object({
  id: v.string('id chương phải là chuỗi'),
  order: v.optional(v.number()),
  lang: v.optional(v.picklist(FIXTURE_LANGUAGES)),
  title: v.optional(v.nullable(v.string())),
  pov: v.optional(v.nullable(v.string())),
  paragraphs: v.number('paragraphs phải là số'),
  paragraphDefinition: v.optional(v.string()),
  chars: v.optional(v.number()),
  characters: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
  notes: v.optional(v.array(v.string())),
  checks: v.optional(v.record(v.string(), v.any()))
})

export type ChapterMeta = v.InferOutput<typeof ChapterMetaSchema>

// --- Assertions schema ---

export const AssertionRuleSchema = v.pipe(
  v.object({
    where: v.optional(v.string()),
    line: v.optional(v.union([v.string(), v.number()])),
    kind: v.optional(v.string()),
    expect: v.optional(v.string()),
    reject: v.optional(v.string()),
    mustContain: v.optional(v.array(v.string())),
    mustContainAny: v.optional(v.array(v.string())),
    mustNotContain: v.optional(v.array(v.string())),
    mustNotContainWord: v.optional(v.array(v.string())),
    pair: v.optional(v.tuple([v.string(), v.string()])),
    dependsOnDraft: v.optional(v.boolean()),
    note: v.optional(v.string())
  }),
  v.check(
    (rule) => rule.where !== undefined || rule.line !== undefined,
    'Quy tắc assertion phải có ít nhất where hoặc line để neo.'
  )
)

export type AssertionRule = v.InferOutput<typeof AssertionRuleSchema>

export const AssertionsFileSchema = v.union([
  v.object({
    status: v.optional(v.picklist(ASSERTION_STATUSES)),
    rules: v.array(AssertionRuleSchema)
  }),
  v.array(AssertionRuleSchema)
])

export type AssertionsFile = v.InferOutput<typeof AssertionsFileSchema>

export function normalizeAssertionRules(file: AssertionsFile): {
  status: AssertionStatus
  rules: AssertionRule[]
} {
  if (Array.isArray(file)) {
    return { status: 'draft', rules: file }
  }
  return {
    status: file.status ?? 'draft',
    rules: file.rules
  }
}
