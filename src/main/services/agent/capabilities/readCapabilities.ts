import * as v from 'valibot'
import { readSideContents, readText } from '../../../infra/storage/textFile'
import type { CapabilityDefinition } from '../types'

export const listWorksCapability: CapabilityDefinition<Record<string, never>> = {
  name: 'list_works',
  description: 'Liệt kê danh sách các tác phẩm có trong thư viện.',
  kind: 'read',
  schema: v.object({}),
  targetPolicy: 'no_target',
  handler: async ({ library }) => {
    const { works } = library.list()
    return {
      ok: true,
      value: works.map((w) => ({
        id: w.id,
        title: w.title,
        sourceLang: w.sourceLang,
        chapterCount: w.chapterCount,
        status: w.status
      }))
    }
  },
  activityAdapter: () => ({
    label: 'Đọc danh sách tác phẩm',
    kind: 'read'
  })
}

export const listChaptersCapability: CapabilityDefinition<{ workId?: string }> = {
  name: 'list_chapters',
  description: 'Liệt kê danh sách các chương của tác phẩm.',
  kind: 'read',
  schema: v.object({
    workId: v.optional(v.string())
  }),
  targetPolicy: 'target_optional',
  handler: async ({ library, target, args }) => {
    const workId = target?.workId ?? args.workId
    if (!workId) {
      return {
        ok: false,
        error: { code: 'validation', message: 'Cần chỉ định workId hoặc target tác phẩm.' }
      }
    }
    try {
      const chapters = library.listChapters(workId)
      return {
        ok: true,
        value: chapters.map((c) => ({
          id: c.id,
          number: c.number,
          title: c.title,
          updatedAt: c.updatedAt
        }))
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'not_found',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  },
  activityAdapter: ({ target, args }) => ({
    label: `Đọc danh mục chương (${target?.workLabel ?? args.workId ?? 'tác phẩm'})`,
    kind: 'read'
  })
}

export const readChapterCapability: CapabilityDefinition<{
  side?: 'source' | 'target' | 'both'
}> = {
  name: 'read_chapter',
  description: 'Đọc nội dung văn bản gốc hoặc bản dịch của một chương.',
  kind: 'read',
  schema: v.object({
    side: v.optional(v.picklist(['source', 'target', 'both']))
  }),
  targetPolicy: 'requires_target',
  handler: async ({ library, target, args }) => {
    if (!target || target.kind !== 'chapter') {
      return {
        ok: false,
        error: { code: 'validation', message: 'read_chapter yêu cầu target loại chapter.' }
      }
    }
    const side = args.side ?? 'both'
    return library.withWork(target.workId, (workDb) => {
      const result: {
        source?: { content: string; rev: number }
        target?: { content: string; rev: number }
      } = {}
      if (side === 'source' || side === 'both') {
        const text = readText(workDb, target.chapterId, 'source')
        result.source = { content: text.content, rev: text.rev }
      }
      if (side === 'target' || side === 'both') {
        const text = readText(workDb, target.chapterId, 'target')
        result.target = { content: text.content, rev: text.rev }
      }
      return { ok: true, value: result }
    })
  },
  activityAdapter: ({ target, args }) => ({
    label: `Đọc nội dung chương "${target?.kind === 'chapter' ? target.chapterLabel : ''}"`,
    kind: 'read',
    detail: { side: args.side ?? 'both' }
  })
}

export const readSegmentsCapability: CapabilityDefinition<{ side: 'source' | 'target' }> = {
  name: 'read_segments',
  description: 'Đọc danh sách các đoạn (segments) của chương.',
  kind: 'read',
  schema: v.object({
    side: v.picklist(['source', 'target'])
  }),
  targetPolicy: 'requires_target',
  handler: async ({ library, target, args }) => {
    if (target?.kind !== 'chapter') {
      return {
        ok: false,
        error: { code: 'validation', message: 'read_segments yêu cầu target loại chapter.' }
      }
    }
    return library.withWork(target.workId, (workDb) => {
      const text = readText(workDb, target.chapterId, args.side)
      return {
        ok: true,
        value: text.segments.map((s) => ({
          id: s.id,
          start: s.start,
          end: s.end,
          textRev: s.textRev,
          status: s.status
        }))
      }
    })
  },
  activityAdapter: ({ target, args }) => ({
    label: `Đọc các đoạn (${args.side}) của chương "${target?.kind === 'chapter' ? target.chapterLabel : ''}"`,
    kind: 'read'
  })
}

export const searchWorkCapability: CapabilityDefinition<{
  query: string
  side?: 'source' | 'target'
}> = {
  name: 'search_work',
  description: 'Tìm kiếm chuỗi văn bản trong toàn bộ các chương của tác phẩm.',
  kind: 'read',
  schema: v.object({
    query: v.pipe(v.string(), v.minLength(1)),
    side: v.optional(v.picklist(['source', 'target']))
  }),
  targetPolicy: 'requires_target',
  handler: async ({ library, target, args }) => {
    if (!target) {
      return {
        ok: false,
        error: { code: 'validation', message: 'search_work yêu cầu target tác phẩm.' }
      }
    }
    const side = args.side ?? 'source'
    const q = args.query.toLowerCase()
    return library.withWork(target.workId, (workDb) => {
      const sideContents = readSideContents(workDb, side)
      const matches: Array<{ chapterId: string; snippet: string }> = []
      for (const [chapterId, content] of sideContents) {
        const idx = content.toLowerCase().indexOf(q)
        if (idx !== -1) {
          const from = Math.max(0, idx - 30)
          const to = Math.min(content.length, idx + q.length + 30)
          matches.push({
            chapterId,
            snippet: content.slice(from, to)
          })
        }
      }
      return { ok: true, value: { matches, totalMatches: matches.length } }
    })
  },
  activityAdapter: ({ target, args }) => ({
    label: `Tìm kiếm "${args.query}" trong "${target?.workLabel ?? 'tác phẩm'}"`,
    kind: 'read'
  })
}

export const listGlossaryCapability: CapabilityDefinition<Record<string, never>> = {
  name: 'list_glossary',
  description: 'Đọc bảng thuật ngữ hiệu lực cho chương.',
  kind: 'read',
  schema: v.object({}),
  targetPolicy: 'requires_target',
  handler: async ({ library, target }) => {
    if (target?.kind !== 'chapter') {
      return {
        ok: false,
        error: { code: 'validation', message: 'list_glossary yêu cầu target chapter.' }
      }
    }
    const entries = library.getEffectiveGlossary(target.workId, target.chapterId)
    return { ok: true, value: entries }
  },
  activityAdapter: ({ target }) => ({
    label: `Đọc thuật ngữ chương "${target?.kind === 'chapter' ? target.chapterLabel : ''}"`,
    kind: 'read'
  })
}

export const listAddressingCapability: CapabilityDefinition<Record<string, never>> = {
  name: 'list_addressing',
  description: 'Đọc các cặp xưng hô hiệu lực cho chương.',
  kind: 'read',
  schema: v.object({}),
  targetPolicy: 'requires_target',
  handler: async ({ library, target }) => {
    if (target?.kind !== 'chapter') {
      return {
        ok: false,
        error: { code: 'validation', message: 'list_addressing yêu cầu target chapter.' }
      }
    }
    const dyads = library.getEffectiveAddressing(target.workId, target.chapterId)
    return { ok: true, value: dyads }
  },
  activityAdapter: ({ target }) => ({
    label: `Đọc xưng hô chương "${target?.kind === 'chapter' ? target.chapterLabel : ''}"`,
    kind: 'read'
  })
}

export const defaultReadCapabilities: CapabilityDefinition[] = [
  listWorksCapability,
  listChaptersCapability,
  readChapterCapability,
  readSegmentsCapability,
  searchWorkCapability,
  listGlossaryCapability,
  listAddressingCapability
]
