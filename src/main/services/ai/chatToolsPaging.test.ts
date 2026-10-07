import { afterEach, describe, expect, it } from 'vitest'
import { segment } from '../../../shared/algorithms/segmenter'
import type { ChapterItem } from '../../../shared/contracts/chapters'
import type { LinkRecord } from '../../../shared/contracts/links'
import type { TextRecord, TextSide } from '../../../shared/contracts/text'
import { createTempDirs } from '../../testing/testing'
import { LibraryStore } from '../library/library'
import { SEARCH_RESULTS_MAX } from './chatSearch'
import { TOOL_TEXT_MAX, createChatTools, type ChatToolLibrary } from './chatTools'

/**
 * Paged reads and work-wide search (change `chat-tools-paging-search`), through the tool runner as the
 * model sees it: the text it gets back and the one line the panel shows.
 */

const WORK = 'work-1'

function chapter(number: number): ChapterItem {
  return {
    id: 'ch-' + number,
    number,
    title: 'Chương ' + number,
    createdAt: 0,
    updatedAt: 0,
    hasSource: true,
    hasTarget: true
  }
}

/** A work whose texts and revisions can change between calls, and which records every read. */
function fakeWork(chapters: number): ChatToolLibrary & {
  texts: Map<string, { content: string; rev: number }>
  writes: number
} {
  const texts = new Map<string, { content: string; rev: number }>()
  return {
    texts,
    writes: 0,
    listChapters: (workId) =>
      workId === WORK ? Array.from({ length: chapters }, (_, i) => chapter(i + 1)) : [],
    readText(_workId: string, chapterId: string, side: TextSide): TextRecord {
      const text = texts.get(chapterId + '/' + side) ?? { content: '', rev: 0 }
      return { content: text.content, rev: text.rev, segments: [] } as unknown as TextRecord
    },
    listLinks: (): LinkRecord[] => []
  }
}

const call = (name: string, args: unknown): { id: string; name: string; args: string } => ({
  id: 'c1',
  name,
  args: JSON.stringify(args)
})

/** The page text of a `read_chapter` answer: everything after the one-line header. */
const pageOf = (content: string): string => content.slice(content.indexOf('\n') + 1)
const cursorOf = (content: string): string | undefined => /con trỏ: (\S+)/.exec(content)?.[1]

describe('read_chapter in pages', () => {
  const long = Array.from({ length: 120 }, (_, i) => `Đoạn ${i + 1}. ` + 'chữ '.repeat(120)).join(
    '\n'
  )

  it('reads a long chapter page by page with the cursor, without overlap or gap', () => {
    const work = fakeWork(3)
    work.texts.set('ch-3/target', { content: long, rev: 12 })
    const tools = createChatTools(work, WORK)
    const pieces: string[] = []
    const details: string[] = []
    let args: Record<string, unknown> = { chapter: 3, side: 'target' }
    for (let guard = 0; guard < 10; guard++) {
      const result = tools.run(call('read_chapter', args))
      pieces.push(pageOf(result.content))
      details.push(result.detail)
      const cursor = cursorOf(result.content)
      if (!cursor) break
      expect(result.content.split('\n')[0]).toMatch(
        /^Chương 3 · bản dịch · rev 12 · đoạn 1?\d+–\d+\/120 · [\d.]+ ký tự · còn tiếp, con trỏ: c3\.target\.p\d+\.o0\.r12$/
      )
      args = { chapter: 3, side: 'target', cursor }
    }
    expect(pieces.join('')).toBe(long)
    expect(pieces.every((piece) => piece.length <= TOOL_TEXT_MAX)).toBe(true)
    expect(details[0]).toMatch(/^Chương 3 · bản dịch — đoạn 1–\d+\/120, [\d.]+ ký tự, còn tiếp$/)
    expect(details.at(-1)).toMatch(/đoạn \d+–120\/120, [\d.]+ ký tự, hết chương$/)
  })

  it('starts at a given paragraph and says so', () => {
    const work = fakeWork(1)
    work.texts.set('ch-1/source', { content: long, rev: 1 })
    const result = createChatTools(work, WORK).run(
      call('read_chapter', { chapter: 1, side: 'source', from_paragraph: 40 })
    )
    expect(result.content).toMatch(/đoạn 40–\d+\/120/)
    expect(pageOf(result.content).startsWith('Đoạn 40.')).toBe(true)
  })

  it('reads a paragraph twice the limit in two goes, the second picking up mid-paragraph', () => {
    const work = fakeWork(1)
    const huge = 'a'.repeat(TOOL_TEXT_MAX * 2)
    work.texts.set('ch-1/source', { content: 'Mở đầu.\n' + huge, rev: 1 })
    const tools = createChatTools(work, WORK)
    const first = tools.run(call('read_chapter', { chapter: 1, side: 'source', from_paragraph: 2 }))
    expect(pageOf(first.content)).toBe('a'.repeat(TOOL_TEXT_MAX))
    expect(first.content).toContain('đoạn 2 chưa hết, còn tiếp')
    const second = tools.run(
      call('read_chapter', { chapter: 1, side: 'source', cursor: cursorOf(first.content) })
    )
    expect(pageOf(second.content)).toBe('a'.repeat(TOOL_TEXT_MAX))
    expect(second.content).toContain('hết chương')
  })

  it('carries on from the same paragraph when the text changed, and warns', () => {
    const work = fakeWork(3)
    work.texts.set('ch-3/target', { content: long, rev: 12 })
    const tools = createChatTools(work, WORK)
    const first = tools.run(call('read_chapter', { chapter: 3, side: 'target' }))
    const cursor = cursorOf(first.content)!
    const paragraph = Number(/\.p(\d+)\./.exec(cursor)![1])
    work.texts.set('ch-3/target', { content: long.replace('Đoạn 1.', 'Đoạn một.'), rev: 13 })
    const second = tools.run(call('read_chapter', { chapter: 3, side: 'target', cursor }))
    expect(second.content).toContain('rev 12 → 13')
    expect(second.content).toContain('vị trí có thể lệch')
    expect(second.content).toContain(`rev 13 · đoạn ${paragraph}–`)
  })

  it('names the paragraph count for a start past the end, instead of an empty page', () => {
    const work = fakeWork(1)
    work.texts.set('ch-1/source', { content: long, rev: 1 })
    const result = createChatTools(work, WORK).run(
      call('read_chapter', { chapter: 1, side: 'source', from_paragraph: 500 })
    )
    expect(result.content).toContain('LỖI')
    expect(result.content).toContain('có 120 đoạn')
  })

  it.each([
    ['garbage', 'không-phải-con-trỏ'],
    ['another chapter', 'c2.source.p1.o0.r1'],
    ['the other side', 'c1.target.p1.o0.r1']
  ])('turns down a cursor for %s and suggests reading by paragraph', (_label, cursor) => {
    const work = fakeWork(2)
    work.texts.set('ch-1/source', { content: long, rev: 1 })
    const result = createChatTools(work, WORK).run(
      call('read_chapter', { chapter: 1, side: 'source', cursor })
    )
    expect(result.content).toContain('Con trỏ không hợp lệ')
    expect(result.content).toContain('from_paragraph')
  })

  it('refuses from_paragraph and cursor together', () => {
    const result = createChatTools(fakeWork(1), WORK).run(
      call('read_chapter', {
        chapter: 1,
        side: 'source',
        from_paragraph: 1,
        cursor: 'c1.source.p1.o0.r1'
      })
    )
    expect(result.content).toContain('Chỉ dùng một trong')
  })

  it('reads no more than the turn has left, and answers that the budget is spent at zero', () => {
    const work = fakeWork(1)
    work.texts.set('ch-1/source', { content: long, rev: 1 })
    const tools = createChatTools(work, WORK)
    const small = tools.run(call('read_chapter', { chapter: 1, side: 'source' }), {
      remainingChars: 1_000,
      turnBudget: 80_000
    })
    expect(pageOf(small.content).length).toBeLessThanOrEqual(1_000)
    expect(small.content).toContain('còn tiếp')
    const none = tools.run(call('read_chapter', { chapter: 1, side: 'source' }), {
      remainingChars: 0,
      turnBudget: 80_000
    })
    expect(none.detail).toBe('Hết ngân sách đọc của lượt (80.000 ký tự)')
    expect(none.content).not.toContain('Đoạn 1.')
  })
})

describe('search_work', () => {
  function workWithNames(): ReturnType<typeof fakeWork> {
    const work = fakeWork(12)
    for (let n = 1; n <= 12; n++) {
      const has = n <= 9
      work.texts.set(`ch-${n}/source`, {
        content: has ? `第${n}章。\n魔王が現れた。\n勇者は魔王を見た。` : `第${n}章。\n何もない。`,
        rev: 1
      })
    }
    return work
  }

  it('finds a Japanese name in every chapter that has it, in chapter then paragraph order', () => {
    const result = createChatTools(workWithNames(), WORK).run(
      call('search_work', { query: '魔王', side: 'source' })
    )
    expect(result.content.split('\n')[0]).toBe('Tìm "魔王" · bản gốc: 18 chỗ khớp ở 9/12 chương.')
    expect(result.content).toContain('1. Chương 1 «Chương 1» · đoạn 2: 魔王が現れた。')
    expect(result.content).toContain('2. Chương 1 «Chương 1» · đoạn 3: 勇者は魔王を見た。')
    expect(result.content).toContain(
      'bản dịch: chưa căn chỉnh — đọc bản dịch chương 1 bằng read_chapter.'
    )
    expect(result.detail).toBe('Tìm "魔王" · bản gốc — 18 chỗ ở 9 chương, trả 18')
  })

  it('returns at most the cap and says how many it left out', () => {
    const work = fakeWork(1)
    work.texts.set('ch-1/target', { content: Array(30).fill('ma vương').join('\n'), rev: 1 })
    const result = createChatTools(work, WORK).run(
      call('search_work', { query: 'Ma Vương', side: 'target' })
    )
    expect(result.content).toContain(`trả ${SEARCH_RESULTS_MAX}, bỏ 10 — thu hẹp chuỗi tìm`)
    expect(result.content.match(/^\d+\. Chương/gm)).toHaveLength(SEARCH_RESULTS_MAX)
  })

  it('says there is no match, and how many chapters it looked in, without an error', () => {
    const result = createChatTools(workWithNames(), WORK).run(
      call('search_work', { query: '竜', side: 'source' })
    )
    expect(result.content).toBe('Tìm "竜" · bản gốc: không có chỗ khớp trong 12 chương.')
    expect(result.content).not.toContain('LỖI')
  })

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['too long', 'x'.repeat(101)]
  ])('turns down a %s query without scanning the work', (_label, query) => {
    const work = workWithNames()
    let reads = 0
    const counting = {
      ...work,
      readText: (...args: Parameters<typeof work.readText>) => (reads++, work.readText(...args))
    }
    const result = createChatTools(counting, WORK).run(
      call('search_work', { query, side: 'source' })
    )
    expect(result.content).toContain('1–100 ký tự')
    expect(reads).toBe(0)
  })
})

describe('with a real work file', () => {
  const tempDir = createTempDirs()
  const stores: LibraryStore[] = []
  afterEach(() => {
    for (const store of stores.splice(0)) store.close()
  })

  it('finds the linked translation of a match, and changes nothing while reading', () => {
    const library = LibraryStore.open({ dataDir: tempDir() })
    stores.push(library)
    const work = library.create({ title: 'Thử', sourceLang: 'ja' })
    const { chapter: one } = library.createChapter(work.id, 'Một')
    const source = '魔王が来た。勇者は逃げた。'
    library.saveText(work.id, one.id, 'source', source, 0, segment(source, 'ja'))
    const sourceRecord = library.readText(work.id, one.id, 'source')
    library.saveRow(work.id, {
      chapterId: one.id,
      sourceId: sourceRecord.segments[0].id,
      text: 'Ma vương đã đến.',
      expectedRev: 0
    })
    const before = {
      source: library.readText(work.id, one.id, 'source').rev,
      target: library.readText(work.id, one.id, 'target').rev,
      links: JSON.stringify(library.listLinks(work.id, one.id))
    }

    const tools = createChatTools(library, work.id)
    const found = tools.run(call('search_work', { query: '魔王', side: 'source' }))
    expect(found.content).toContain('bản dịch: Ma vương đã đến.')
    const unaligned = tools.run(call('search_work', { query: '勇者', side: 'source' }))
    expect(unaligned.content).toContain('chưa căn chỉnh')
    tools.run(call('read_chapter', { chapter: 1, side: 'target' }))
    tools.run(call('list_chapters', {}))

    expect({
      source: library.readText(work.id, one.id, 'source').rev,
      target: library.readText(work.id, one.id, 'target').rev,
      links: JSON.stringify(library.listLinks(work.id, one.id))
    }).toEqual(before)
  })
})
